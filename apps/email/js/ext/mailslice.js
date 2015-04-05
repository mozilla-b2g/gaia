/**
 * Presents a message-centric view of a slice of time from IMAP search results.
 *
 * == Use-case assumptions
 *
 * - We are backing a UI showing a list of time-ordered messages.  This can be
 *   the contents of a folder, on-server search results, or the
 *   (server-facilitated) list of messages in a conversation.
 * - We want to fetch more messages as the user scrolls so that the entire
 *   contents of the folder/search results list are available.
 * - We want to show the message as soon as possible.  So we can show a message
 *   in the list before we have its snippet.  However, we do want the
 *   bodystructure before we show it so we can accurately know if it has
 *   attachments.
 * - We want to update the state of the messages in real-time as we hear about
 *   changes from the server, such as another client starring a message or
 *   marking the message read.
 * - We will synchronize some folders with either a time and/or message count
 *   threshold.
 * - We want mutations made locally to appear as if they are applied
 *   immediately, even if we are operating offline.
 *
 * == Efficiency desires
 *
 * - Avoid redundant network traffic by caching our results using IndexedDB.
 * - Keep the I/O burden and overhead low from caching/sync.  We know our
 *   primary IndexedDB implementation is backed by SQLite with full
 *   transaction commits corresponding to IndexedDB transaction commits.
 *   We also know that all IndexedDB work gets marshaled to another thread.
 *   Since the server is the final word in state, except for mutations we
 *   trigger, we don't need to be aggressive about persisting state.
 *   Accordingly, let's persist our data in big blocks only on major
 *   transitions (folder change) or when our memory usage is getting high.
 *   (If we were using LevelDB, large writes would probably be less
 *   desirable.)
 *
 * == Of slices, folders, and gmail
 *
 * It would be silly for a slice that is for browsing the folder unfiltered and
 * a slice that is a result of a search to act as if they were dealing with
 * different messages.  Similarly, it would be silly in gmail for us to fetch
 * a message that we know is the same message across multiple (labels as)
 * folders.  So we abstract away the storage details to `FolderStorage`.
 *
 * == Latency, offline access, and IMAP
 *
 * The fundamental trade-off is between delaying showing things in the UI and
 * showing them and then having a bunch of stuff happen a split-second later.
 * (Messages appearing, disappearing, having their status change, etc.)
 *
 **/

define(function(require, exports, module) {

var logic = require('logic');
var $util = require('./util');
var $a64 = require('./a64');
var $allback = require('./allback');
var $date = require('./date');
var $sync = require('./syncbase');

var bsearchForInsert = $util.bsearchForInsert,
    bsearchMaybeExists = $util.bsearchMaybeExists,
    cmpHeaderYoungToOld = $util.cmpHeaderYoungToOld,
    allbackMaker = $allback.allbackMaker,
    BEFORE = $date.BEFORE,
    ON_OR_BEFORE = $date.ON_OR_BEFORE,
    SINCE = $date.SINCE,
    STRICTLY_AFTER = $date.STRICTLY_AFTER,
    IN_BS_DATE_RANGE = $date.IN_BS_DATE_RANGE,
    HOUR_MILLIS = $date.HOUR_MILLIS,
    DAY_MILLIS = $date.DAY_MILLIS,
    NOW = $date.NOW,
    quantizeDate = $date.quantizeDate,
    quantizeDateUp = $date.quantizeDateUp;

var PASTWARDS = 1, FUTUREWARDS = -1;

// What do we think the post-snappy compression overhead of the structured clone
// persistence rep will be for various things?  These are total guesses right
// now.  Keep in mind we do want the pre-compression size of the data in all
// cases and we just hope it will compress a bit.  For the attributes we are
// including the attribute name as well as any fixed-overhead for its payload,
// especially numbers which may or may not be zig-zag encoded/etc.
var OBJ_OVERHEAD_EST = 2, STR_ATTR_OVERHEAD_EST = 5,
    NUM_ATTR_OVERHEAD_EST = 10, LIST_ATTR_OVERHEAD_EST = 4,
    NULL_ATTR_OVERHEAD_EST = 2, LIST_OVERHEAD_EST = 4,
    NUM_OVERHEAD_EST = 8, STR_OVERHEAD_EST = 4;

/**
 * Intersects two objects each defining tupled ranges of the type
 * { startTS, startUID, endTS, endUID }, like block infos and mail slices.
 * This is exported for unit testing purposes and because no state is closed
 * over.
 */
var tupleRangeIntersectsTupleRange = exports.tupleRangeIntersectsTupleRange =
    function tupleRangeIntersectsTupleRange(a, b) {
  if (BEFORE(a.endTS, b.startTS) ||
      STRICTLY_AFTER(a.startTS, b.endTS))
    return false;
  if ((a.endTS === b.startTS && a.endUID < b.startUID) ||
      (a.startTS === b.endTS && a.startTS > b.endUID))
    return false;
  return true;
};

/**
 * How much progress in the range [0.0, 1.0] should we report for just having
 * started the synchronization process?  The idea is that by having this be
 * greater than 0, our progress bar indicates that we are doing something or
 * at least know we should be doing something.
 */
var SYNC_START_MINIMUM_PROGRESS = 0.02;

/**
 * Book-keeping and limited agency for the slices.
 *
 * === Batching ===
 * Headers are removed, added, or modified using the onHeader* methods.
 * The updates are sent to 'SliceBridgeProxy' which batches updates and
 * puts them on the event loop. We batch so that we can minimize the number of
 * reflows and painting on the DOM side. This also enables us to batch data
 * received in network packets around the smae time without having to handle it in
 * each protocol's logic.
 *
 * Currently, we only batch updates that are done between 'now' and the next time
 * a zeroTimeout can fire on the event loop.  In order to keep the UI responsive,
 * We force flushes if we have more than 5 pending slices to send.
 */
function MailSlice(bridgeHandle, storage) {
  this._bridgeHandle = bridgeHandle;
  bridgeHandle.__listener = this;
  this._storage = storage;

  logic.defineScope(this, 'MailSlice', { bridgeHandle: bridgeHandle._handle });

  // The time range of the headers we are looking at right now.
  this.startTS = null;
  this.startUID = null;
  // If the end values line up with the most recent message known about for this
  // folder, then we will grow to encompass more recent messages.
  this.endTS = null;
  this.endUID = null;

  /**
   * A string value for hypothetical debugging purposes, but which is coerced
   * to a Boolean value for some of our slice notifications as both the
   * userRequested/moreExpected values, although they aren't super important.
   */
  this.waitingOnData = false;

  /**
   * If true, don't add any headers.  This is used by ActiveSync during its
   * synchronization step to wait until all headers have been retrieved and
   * then the slice is populated from the database.  After this initial sync,
   * ignoreHeaders is set to false so that updates and (hopefully small
   * numbers of) additions/removals can be observed.
   */
  this.ignoreHeaders = false;

  /**
   * @listof[HeaderInfo]
   */
  this.headers = [];
  this.desiredHeaders = $sync.INITIAL_FILL_SIZE;

  this.headerCount = storage.headerCount;
}
exports.MailSlice = MailSlice;
MailSlice.prototype = {
  /**
   * We are a folder-backed view-slice.
   */
  type: 'folder',

  set atTop(val) {
    if (this._bridgeHandle)
      this._bridgeHandle.atTop = val;
    return val;
  },
  set atBottom(val) {
    if (this._bridgeHandle)
      this._bridgeHandle.atBottom = val;
    return val;
  },
  set userCanGrowUpwards(val) {
    if (this._bridgeHandle)
      this._bridgeHandle.userCanGrowUpwards = val;
    return val;
  },
  set userCanGrowDownwards(val) {
    if (this._bridgeHandle)
      this._bridgeHandle.userCanGrowDownwards = val;
    return val;
  },
  set headerCount(val) {
    if (this._bridgeHandle)
      this._bridgeHandle.headerCount = val;
    return val;
  },

  _updateSliceFlags: function() {
    var flagHolder = this._bridgeHandle;
    flagHolder.atTop = this._storage.headerIsYoungestKnown(this.endTS,
                                                           this.endUID);
    flagHolder.atBottom = this._storage.headerIsOldestKnown(this.startTS,
                                                            this.startUID);
    if (flagHolder.atTop)
      flagHolder.userCanGrowUpwards = !this._storage.syncedToToday();
    else
      flagHolder.userCanGrowUpwards = false;

    if (flagHolder.atBottom)
      flagHolder.userCanGrowDownwards = !this._storage.syncedToDawnOfTime();
    else
      flagHolder.userCanGrowDownwards = false;
  },

  /**
   * Reset the state of the slice, clearing out any known headers.
   */
  reset: function() {
    if (!this._bridgeHandle)
      return;

    if (this.headers.length) {
      this._bridgeHandle.sendSplice(0, this.headers.length, [], false, true);
      this.headers.splice(0, this.headers.length);

      this.startTS = null;
      this.startUID = null;
      this.endTS = null;
      this.endUID = null;
    }
  },

  /**
   * Force an update of our current date range.
   */
  refresh: function() {
    this._storage.refreshSlice(this);
  },

  reqNoteRanges: function(firstIndex, firstSuid, lastIndex, lastSuid) {
    if (!this._bridgeHandle)
      return;

    var i;
    // - Fixup indices if required
    if (firstIndex >= this.headers.length ||
        this.headers[firstIndex].suid !== firstSuid) {
      firstIndex = 0; // default to not splicing if it's gone
      for (i = 0; i < this.headers.length; i++) {
        if (this.headers[i].suid === firstSuid) {
          firstIndex = i;
          break;
        }
      }
    }
    if (lastIndex >= this.headers.length ||
        this.headers[lastIndex].suid !== lastSuid) {
      for (i = this.headers.length - 1; i >= 0; i--) {
        if (this.headers[i].suid === lastSuid) {
          lastIndex = i;
          break;
        }
      }
    }

    // - Perform splices as required
    // (high before low to avoid index changes)
    if (lastIndex + 1 < this.headers.length) {
      this.atBottom = false;
      this.userCanGrowDownwards = false;
      var delCount = this.headers.length - lastIndex  - 1;
      this.desiredHeaders -= delCount;
      this._bridgeHandle.sendSplice(
        lastIndex + 1, delCount, [],
        // This is expected; more coming if there's a low-end splice
        true, firstIndex > 0);
      this.headers.splice(lastIndex + 1, this.headers.length - lastIndex - 1);
      var lastHeader = this.headers[lastIndex];
      this.startTS = lastHeader.date;
      this.startUID = lastHeader.id;
    }
    if (firstIndex > 0) {
      this.atTop = false;
      this.userCanGrowUpwards = false;
      this.desiredHeaders -= firstIndex;
      this._bridgeHandle.sendSplice(0, firstIndex, [], true, false);
      this.headers.splice(0, firstIndex);
      var firstHeader = this.headers[0];
      this.endTS = firstHeader.date;
      this.endUID = firstHeader.id;
    }

    this._storage.sliceShrunk(this);
  },

  reqGrow: function(dirMagnitude, userRequestsGrowth) {
    if (dirMagnitude === -1)
      dirMagnitude = -$sync.INITIAL_FILL_SIZE;
    else if (dirMagnitude === 1)
      dirMagnitude = $sync.INITIAL_FILL_SIZE;
    this._storage.growSlice(this, dirMagnitude, userRequestsGrowth);
  },

  sendEmptyCompletion: function() {
    this.setStatus('synced', true, false);
  },

  setStatus: function(status, requested, moreExpected, flushAccumulated,
                      progress, newEmailCount) {
    if (!this._bridgeHandle)
      return;

    switch (status) {
      case 'synced':
      case 'syncfailed':
        this._updateSliceFlags();
        break;
    }
    this._bridgeHandle.sendStatus(status, requested, moreExpected, progress,
                                    newEmailCount);
  },

  /**
   * Update our sync progress with a value in the range [0.0, 1.0].  We leave
   * it up to the specific protocol to determine how it maps values.
   */
  setSyncProgress: function(value) {
    if (!this._bridgeHandle)
      return;
    this._bridgeHandle.sendSyncProgress(value);
  },

  /**
   * @args[
   *   @param[headers @listof[MailHeader]]
   *   @param[insertAt @oneof[
   *     @case[-1]{
   *       Append to the end of the list
   *     }
   *     @case[Number]{
   *       Insert the headers at the given index.
   *     }
   *   ]]
   *   @param[moreComing Boolean]
   * ]
   */
  batchAppendHeaders: function(headers, insertAt, moreComing) {
    if (!this._bridgeHandle)
      return;

    logic(this, 'headersAppended', { headers: headers });
    if (insertAt === -1)
      insertAt = this.headers.length;
    this.headers.splice.apply(this.headers, [insertAt, 0].concat(headers));

    // XXX this can obviously be optimized to not be a loop
    for (var i = 0; i < headers.length; i++) {
      var header = headers[i];
      if (this.startTS === null ||
          BEFORE(header.date, this.startTS)) {
        this.startTS = header.date;
        this.startUID = header.id;
      }
      else if (header.date === this.startTS &&
               header.id < this.startUID) {
        this.startUID = header.id;
      }
      if (this.endTS === null ||
          STRICTLY_AFTER(header.date, this.endTS)) {
        this.endTS = header.date;
        this.endUID = header.id;
      }
      else if (header.date === this.endTS &&
               header.id > this.endUID) {
        this.endUID = header.id;
      }
    }

    this._updateSliceFlags();
    this._bridgeHandle.sendSplice(insertAt, 0, headers,
                                  true, moreComing);
  },

  /**
   * Tell the slice about a header it should be interested in.  This should
   * be unconditionally called by a sync populating this slice, or conditionally
   * called when the header is in the time-range of interest and a refresh,
   * cron-triggered sync, or IDLE/push tells us to do so.
   */
  onHeaderAdded: function(header, body, syncDriven, messageIsNew) {
    if (!this._bridgeHandle)
      return;

    var idx = bsearchForInsert(this.headers, header, cmpHeaderYoungToOld);
    var hlen = this.headers.length;
    // Don't append the header if it would expand us beyond our requested
    // amount.  Note that this does not guarantee that we won't end up with more
    // headers than originally planned; if we get told about headers earlier
    // than the last slot, we will insert them and grow without forcing a
    // removal of something else to offset.
    if (hlen >= this.desiredHeaders && idx === hlen)
      return;
    // If we are inserting (not at the end) then be sure to grow
    // the number of desired headers to be consistent with the number of headers
    // we have.
    if (hlen >= this.desiredHeaders)
      this.desiredHeaders++;

    if (this.startTS === null ||
        BEFORE(header.date, this.startTS)) {
      this.startTS = header.date;
      this.startUID = header.id;
    }
    else if (header.date === this.startTS &&
             header.id < this.startUID) {
      this.startUID = header.id;
    }
    if (this.endTS === null ||
        STRICTLY_AFTER(header.date, this.endTS)) {
      this.endTS = header.date;
      this.endUID = header.id;
    }
    else if (header.date === this.endTS &&
             header.id > this.endUID) {
      this.endUID = header.id;
    }

    logic(this, 'headerAdded', { index: idx, header: header });
    this._bridgeHandle.sendSplice(idx, 0, [header],
                                  Boolean(this.waitingOnData),
                                  Boolean(this.waitingOnData));
    this.headers.splice(idx, 0, header);
  },

  /**
   * Tells the slice that a header it should know about has changed.  (If
   * this is a search, it's okay for it not to know...)
   */
  onHeaderModified: function(header, body) {
    if (!this._bridgeHandle)
      return;

    // this can only affect flags which will not affect ordering
    var idx = bsearchMaybeExists(this.headers, header, cmpHeaderYoungToOld);
    if (idx !== null) {
      // There is no identity invariant to ensure this is already true.
      this.headers[idx] = header;
      logic(this, 'headerModified', { index: idx, header: header });
      this._bridgeHandle.sendUpdate([idx, header]);
    }
  },

  /**
   * Tells the slice that a header it should know about has been removed.
   */
  onHeaderRemoved: function(header) {
    if (!this._bridgeHandle)
      return;

    var idx = bsearchMaybeExists(this.headers, header, cmpHeaderYoungToOld);
    if (idx !== null) {
      logic(this, 'headerRemoved', { index: idx, header: header });
      this._bridgeHandle.sendSplice(idx, 1, [],
                                    Boolean(this.waitingOnData),
                                    Boolean(this.waitingOnData));
      this.headers.splice(idx, 1);

      // update time-ranges if required...
      if (header.date === this.endTS && header.id === this.endUID) {
        if (!this.headers.length) {
          this.endTS = null;
          this.endUID = null;
        }
        else {
          this.endTS = this.headers[0].date;
          this.endUID = this.headers[0].id;
        }
      }
      if (header.date === this.startTS && header.id === this.startUID) {
        if (!this.headers.length) {
          this.startTS = null;
          this.startUID = null;
        }
        else {
          var lastHeader = this.headers[this.headers.length - 1];
          this.startTS = lastHeader.date;
          this.startUID = lastHeader.id;
        }
      }
    }
  },

  die: function() {
    this._bridgeHandle = null;
    this.desiredHeaders = 0;
    this._storage.dyingSlice(this);
  },

  get isDead() {
    return this._bridgeHandle === null;
  },
};


/**
 * Folder version history:
 *
 * v3: Unread count tracking fixed, so we need to re-run it.
 *
 * v2: Initial unread count tracking.  Regrettably with bad maths.
 */
var FOLDER_DB_VERSION = exports.FOLDER_DB_VERSION = 3;

/**
 * Per-folder message caching/storage; issues per-folder `MailSlice`s and keeps
 * them up-to-date.  Access is mediated through the use of mutexes which must be
 * acquired for write access and are advisable for read access that requires
 * access to more than a single message.
 *
 * ## Naming and Ordering
 *
 * Messages in the folder are named and ordered by the tuple of the message's
 * received date and a "sufficiently unique identifier" (SUID) we allocate.
 *
 * The SUID is actually a concatenation of an autoincrementing per-folder 'id'
 * to our folder id, which in turn contains the account id.  Internally, we only
 * care about the 'id' since the rest is constant for the folder.  However, all
 * APIs layered above us need to deal in SUIDs since we will eventually have
 * `MailSlice` instances that aggregate the contents so it is important that the
 * extra information always be passed around.
 *
 * Because the SUID has no time component and for performance we want a total
 * ordering on the messages, messages are first ordered on their 'received'
 * date.  For IMAP this is the message's INTERNALDATE.  For ActiveSync this is
 * the email:DateReceived element.  Accordingly, when performing a lookup, we
 * either need the exact date of the message or a reasonable bounded time range
 * in which it could fall (which should be a given for date range scans).
 *
 * ## Storage, Caching, Cache Flushing
 *
 * Storage is done using IndexedDB, with message header information and message
 * body information stored in separate blocks of information.  See the
 * `maildb.js` file and `MailDB` class for more detailed information.
 *
 * Blocks are loaded from disk on demand and cached, although preferably hints
 * are received so we can pre-load information.  Blocks are discarded from the
 * cache automatically when a mutex is released or when explicitly invoked by
 * the code currently holding the mutex.  Code that can potentially cause a
 * large number of blocks to be loaded is responsible for periodically
 * triggering cache evictions and/or writing of dirty blocks to disk so that
 * cache evictions are possible.
 *
 * We avoid automatic cache eviction in order to avoid the class of complex bugs
 * that might arise.  While well-written code should not run afoul of automatic
 * cache eviction were it to exist, buggy code happens.  We can more reliably
 * detect potentially buggy code this way by simply reporting whenever the
 * number of loaded blocks exceeds some threshold.
 *
 * When evicting blocks from cache, we try and keep blocks around that contain
 * messages referenced by active `MailSlice` instances in order to avoid the
 * situation where we discard blocks just to reload them with the next user
 * action, and with added latency.
 *
 * If WeakMap were standardized, we would instead move blocks into a WeakMap,
 * but it's not, so we don't.
 *
 * ## Block Purging (IMAP)
 *
 * For account types like IMAP where we can incrementally grow the set of
 * messages we have synchronized from the server, our entire database is
 * effectively a cache of the server state.  This is in contrast to ActiveSync
 * where we synchronize a fixed time-window of messages and so the exact set of
 * messages we should know about is well-defined and bounded.  As a result, we
 * need to be able to purge old messages that the user no longer appears to
 * care about so that our disk usage does not grow without bound.
 *
 * We currently trigger block purging as the result of block growth in a folder.
 * Specifically
 *
 * Messages are discarded from storage when experiencing storage pressure.  We
 * figure it's better to cache what we have until it's known useless (deleted
 * messages) or we definitely need the space for something else.
 *
 * ## Concurrency and I/O
 *
 * The logic in this class can operate synchronously as long as the relevant
 * header/body blocks are in-memory.  For simplicity, we (asynchronously) defer
 * execution of calls that mutate state while loads are in-progress; callers
 * will not block.  This simplifies our implementation and thinking about our
 * implementation without making life for our users much worse.
 *
 * Specifically, all UI requests for data will be serviced immediately if the
 * data is available.  If the data is not available, the wait would have
 * happened anyways.  Mutations will be enqueued, but are always speculatively
 * assumed to succeed by the UI anyways so when they are serviced is not
 * exceedingly important other than a burden on us to surface in the UI that
 * we still have some state to synchronize to the server so the user does
 * not power-off their phone quite yet.
 *
 * ## Types
 *
 * @typedef[AccuracyRangeInfo @dict[
 *   @key[endTS DateMS]{
 *     This value is exclusive in keeping with IMAP BEFORE semantics.
 *   }
 *   @key[startTS DateMS]{
 *     This value is inclusive in keeping with IMAP SINCE semantics.
 *   }
 *   @key[fullSync @dict[
 *     @key[highestModseq #:optional String]{
 *       The highest modseq for this range, if we have one.  This would be the
 *       value reported on folder entry, plus any maximization that occurs if we
 *       utilized IDLE or some other mechanism to keep the range up-to-date.
 *       On servers without highestmodseq, this will be null.
 *     }
 *     @key[updated DateMS]{
 *       What was our local timestamp the last time we synchronized this range?
 *       This is speculative and probably just for debugging unless we have the
 *       UI reflect that in offline mode it knows what it is showing you could
 *       be fairly out of date.
 *     }
 *   }
 *   ]]{
 *     Did we fully synchronize this time range (because of a date scan)?  If
 *     false, the implication is that we know about the messages in this range
 *     because of some type of search.
 *   }
 * ]]{
 *   Describes the provenance of the data we have for a given time range.
 *   Tracked independently of the block data because there doesn't really seem
 *   to be an upside to coupling them.
 *
 *   This lets us know when we have sufficiently valid data to display messages
 *   without needing to talk to the server, allows us to size checks for
 *   new messages in time ranges, and should be a useful debugging aid.
 * }
 * @typedef[FolderBlockInfo @dict[
 *   @key[blockId BlockId]{
 *     The name of the block for storage access.
 *   }
 *   @key[startTS DateMS]{
 *     The timestamp of the last and therefore (possibly equally) oldest message
 *     in this block.  Forms the first part of a composite key with `startUID`.
 *   }
 *   @key[startUID UID]{
 *     The UID of the last and therefore (possibly equally) oldest message
 *     in this block.  Forms the second part of a composite key with `startTS`.
 *   }
 *   @key[endTS DateMS]{
 *     The timestamp of the first and therefore (possibly equally) newest
 *     message in this block.  Forms the first part of a composite key with
 *     `endUID`.
 *   }
 *   @key[endUID UID]{
 *     The UID of the first and therefore (possibly equally) newest message
 *     in this block.  Forms the second part of a composite key with `endTS`.
 *   }
 *   @key[count Number]{
 *     The number of messages in this bucket.
 *   }
 *   @key[estSize Number]{
 *     The estimated size in bytes all of the messages in this bucket use.  This
 *     is to assist us in known when to split/merge blocks.
 *   }
 * ]]{
 *   The directory entries for our `HeaderBlock` and `BodyBlock` instances.
 *   Currently, these are always stored in memory since they are small and
 *   there shouldn't be a tremendous number of them.
 *
 *   These
 * }
 * @typedef[EmailAddress String]
 * @typedef[NameAddressPair @dict[
 *   @key[address EmailAddress]
 *   @key[name String]
 * ]]
 * @typedef[HeaderInfo @dict[
 *   @key[id]{
 *     An id allocated by the back-end that names the message within the folder.
 *     We use this instead of the server-issued UID because if we used the UID
 *     for this purpose then we would still need to issue our own temporary
 *     speculative id's for offline operations and would need to implement
 *     renaming and it all gets complicated.
 *   }
 *   @key[srvid]{
 *     The server-issued UID for the folder, or 0 if the folder is an offline
 *     header.
 *   }
 *   @key[suid]{
 *     Basically "account id/folder id/message id", although technically the
 *     folder id includes the account id.
 *   }
 *   @key[guid String]{
 *     This is the message-id header value of the message.
 *   }
 *   @key[author NameAddressPair]
 *   @key[date DateMS]
 *   @key[flags @listof[String]]
 *   @key[hasAttachments Boolean]
 *   @key[subject String]
 *   @key[snippet @oneof[
 *     @case[null]{
 *       We haven't tried to generate a snippet yet.
 *     }
 *     @case['']{
 *       We tried to generate a snippet, but got nothing useful.  Note that we
 *       may try and generate a snippet from a partial body fetch; this does not
 *       indicate that we should avoid computing a better snippet.  Whenever the
 *       snippet is falsey and we have retrieved more body data, we should
 *       always try and derive a snippet.
 *     }
 *     @case[String]{
 *       A non-empty string means we managed to produce some snippet data.  It
 *        is still appropriate to regenerate the snippet if more body data is
 *        fetched since our snippet may be a fallback where we chose quoted text
 *        instead of authored text, etc.
 *     }
 *   ]]
 * ]]
 * @typedef[HeaderBlock @dict[
 *   @key[ids @listof[ID]]{
 *     The issued-by-us-id's of the headers in the same order (not the IMAP
 *     UID).  This is intended as a fast parallel search mechanism.  It can be
 *     discarded if it doesn't prove useful.
 *
 *     XXX We want to rename this to be "ids" in a refactoring pass in the
 *     future.
 *   }
 *   @key[headers @listof[HeaderInfo]]{
 *     Headers in numerically decreasing time and issued-by-us-ID order.  The
 *     header at index 0 should correspond to the 'end' characteristics of the
 *     blockInfo and the header at n-1 should correspond to the start
 *     characteristics.
 *   }
 * ]]
 * @typedef[AttachmentInfo @dict[
 *   @key[name String]{
 *     The filename of the attachment, if any.
 *   }
 *   @key[contentId String]{
 *     The content-id of the attachment if this is a related part for inline
 *     display.
 *   }
 *   @key[type String]{
 *     The (full) mime-type of the attachment.
 *   }
 *   @key[part String]{
 *     The IMAP part number for fetching the attachment.
 *   }
 *   @key[encoding String]{
 *     The encoding of the attachment so we know how to decode it.
 *   }
 *   @key[sizeEstimate Number]{
 *     Estimated file size in bytes.  Gets updated to be the correct size on
 *     attachment download.
 *   }
 *   @key[file @oneof[
 *     @case[null]{
 *       The attachment has not been downloaded, the file size is an estimate.
 *     }
 *     @case[@list["device storage type" "file path"]{
 *       The DeviceStorage type (ex: pictures) and the path to the file within
 *       device storage.
 *     }
 *     @case[HTMLBlob]{
 *       The Blob that contains the attachment.  It can be thought of as a
 *       handle/name to access the attachment.  IndexedDB in Gecko stores the
 *       blobs as (quota-tracked) files on the file-system rather than inline
 *       with the record, to the attachments don't need to count against our
 *       block size since they are not part of the direct I/O burden for the
 *       block.
 *     }
 *   ]]
 *   @key[charset @oneof[undefined String]]{
 *     The character set, for example "ISO-8859-1".  If not specified, as is
 *     likely for binary attachments, this should be null.
 *   }
 *   @key[textFormat @oneof[undefined String]]{
 *     The text format, for example, "flowed" for format=flowed.  If not
 *     specified, as is likely for binary attachments, this should be null.
 *   }
 * ]]
 * @typedef[BodyInfo @dict[
 *   @key[date DateMS]{
 *     Redundantly stored date info for block splitting purposes.  We pretty
 *     much need this no matter what because our ordering is on the tuples of
 *     dates and UIDs, so we could have trouble efficiently locating our header
 *     from the body without this.
 *   }
 *   @key[size Number]
 *   @key[to @listof[NameAddressPair]]
 *   @key[cc @listof[NameAddressPair]]
 *   @key[bcc @listof[NameAddressPair]]
 *   @key[replyTo NameAddressPair]
 *   @key[attachments @listof[AttachmentInfo]]{
 *     Proper attachments for explicit downloading.
 *   }
 *   @key[relatedParts @oneof[null @listof[AttachmentInfo]]]{
 *     Attachments for inline display in the contents of the (hopefully)
 *     multipart/related message.
 *   }
 *   @key[references @oneof[null @listof[String]]]{
 *     The contents of the references header as a list of de-quoted ('<' and
 *     '>' removed) message-id's.  If there was no header, this is null.
 *   }
 *   @key[bodyReps @listof[@oneof[String Array]]]{
 *     This is a list where each two consecutive elements describe a body
 *     representation.  The even indices are the body rep types which are
 *     either 'plain' or 'html'.  The odd indices are the actual
 *     representations.
 *
 *     The representation for 'plain' values is a `quotechew.js` processed
 *     body representation (which is itself a similar pair-wise list except
 *     that the identifiers are packed integers).
 *
 *     The body representation for 'html' values is an already sanitized and
 *     already quote-normalized String representation that could be directly
 *     fed into innerHTML safely if you were so inclined.  See `htmlchew.js`
 *     for more on that process.
 *   }
 * ]]{
 *   Information on the message body that is only for full message display.
 *   The to/cc/bcc information may get moved up to the header in the future,
 *   but our driving UI doesn't need it right now.
 * }
 * @typedef[BodyBlock @dict[
 *   @key[ids @listof[ID]]{
 *     The issued-by-us id's of the messages; the order is parallel to the order
 *     of `bodies.`
 *   }
 *   @key[bodies @dictof[
 *     @key["unique identifier" ID]
 *     @value[BodyInfo]
 *   ]]
 * ]]
 */
function FolderStorage(account, folderId, persistedFolderInfo, dbConn,
                       FolderSyncer) {
  /** Our owning account. */
  this._account = account;
  this._imapDb = dbConn;

  this.folderId = folderId;
  this.folderMeta = persistedFolderInfo.$meta;
  this._folderImpl = persistedFolderInfo.$impl;

  logic.defineScope(this, 'FolderStorage', {
    accountId: account.id,
    folderId: folderId
  });

  /**
   * @listof[AccuracyRangeInfo]{
   *   Newest-to-oldest sorted list of accuracy range info structures that are
   *   keyed by their IMAP-consistent startTS (inclusive) and endTS (exclusive)
   *   on a per-day granularity.
   * }
   */
  this._accuracyRanges = persistedFolderInfo.accuracy;
  /**
   * @listof[FolderBlockInfo]{
   *   Newest-to-oldest (numerically decreasing time and ID) sorted list of
   *   header folder block infos.  They are keyed by a composite key consisting
   *   of messages' "date" and "id" fields.
   * }
   */
  this._headerBlockInfos = persistedFolderInfo.headerBlocks;

  // Calculate total number of messages
  this.headerCount = 0;
  if (this._headerBlockInfos) {
    this._headerBlockInfos.forEach(function(headerBlockInfo) {
      this.headerCount += headerBlockInfo.count;
    }.bind(this));
  }

  /**
   * @listof[FolderBlockInfo]{
   *   Newest-to-oldest (numerically decreasing time and ID) sorted list of
   *   body folder block infos.  They are keyed by a composite key consisting
   *   of messages' "date" and "id" fields.
   * }
   */
  this._bodyBlockInfos = persistedFolderInfo.bodyBlocks;

  /**
   * @oneof[null @dictof[
   *   @key[ServerID]{
   *     The "srvid" value of a header entry.
   *   }
   *   @value[BlockID]{
   *     The block the header is stored in.
   *   }
   * ]]
   */
  this._serverIdHeaderBlockMapping =
    persistedFolderInfo.serverIdHeaderBlockMapping;

  /**
   * @dictof[@key[BlockId] @value[HeaderBlock]]{
   *   In-memory cache of header blocks.
   * }
   */
  this._headerBlocks = {};
  /**
   * @listof[FolderBlockInfo]{
   *   The block infos of all the header blocks in `_headerBlocks`.  Exists so
   *   that we don't need to map blocks back to their block infos when we are
   *   considering flushing things.  This could also be used for most recently
   *   loaded tracking.
   * }
   */
  this._loadedHeaderBlockInfos = [];
  /**
   * @dictof[@key[BlockId] @value[BodyBlock]]{
   *   In-memory cache of body blocks.
   * }
   */
  this._bodyBlocks = {};
  /**
   * @listof[FolderBlockInfo]{
   *   The block infos of all the body blocks in `_bodyBlocks`.  Exists so
   *   that we don't need to map blocks back to their block infos when we are
   *   considering flushing things.  This could also be used for most recently
   *   loaded tracking.
   * }
   */
  this._loadedBodyBlockInfos = [];

  this._flushExcessTimeoutId = 0;

  this._bound_flushExcessOnTimeout = this._flushExcessOnTimeout.bind(this);
  this._bound_makeHeaderBlock = this._makeHeaderBlock.bind(this);
  this._bound_insertHeaderInBlock = this._insertHeaderInBlock.bind(this);
  this._bound_splitHeaderBlock = this._splitHeaderBlock.bind(this);
  this._bound_deleteHeaderFromBlock = this._deleteHeaderFromBlock.bind(this);

  this._bound_makeBodyBlock = this._makeBodyBlock.bind(this);
  this._bound_insertBodyInBlock = this._insertBodyInBlock.bind(this);
  this._bound_splitBodyBlock = this._splitBodyBlock.bind(this);
  this._bound_deleteBodyFromBlock = this._deleteBodyFromBlock.bind(this);


  /**
   * Has our internal state altered at all and will need to be persisted?
   */
  this._dirty = false;
  /** @dictof[@key[BlockId] @value[HeaderBlock]] */
  this._dirtyHeaderBlocks = {};
  /** @dictof[@key[BlockId] @value[BodyBlock]] */
  this._dirtyBodyBlocks = {};

  /**
   * @listof[AggrBlockId]
   */
  this._pendingLoads = [];
  /**
   * @dictof[
   *   @key[AggrBlockId]
   *   @key[@listof[@func]]
   * ]
   */
  this._pendingLoadListeners = {};

  /**
   * @listof[@func[]]{
   *   A list of fully-bound functions to drain when the last pending load gets
   *   loaded, at least until a new load goes pending.
   * }
   */
  this._deferredCalls = [];

  /**
   * @listof[@dict[
   *   @key[name String]{
   *     A string describing the operation to be performed for debugging
   *     purposes.  This string must not include any user data.
   *   }
   *   @key[func @func[@args[callWhenDone]]]{
   *     The function to be invoked.
   *   }
   * ]]{
   *   The list of mutexed call operations queued.  The first entry is the
   *   currently executing entry.
   * }
   */
  this._mutexQueue = [];

  /**
   * Active view / search slices on this folder.
   */
  this._slices = [];

  /**
   * The slice that is driving our current synchronization and wants to hear
   * about all header modifications/notes as they occur.  This will be null
   * when performing a refresh sync.
   */
  this._curSyncSlice = null;

  this._messagePurgeScheduled = false;
  this.folderSyncer = FolderSyncer && new FolderSyncer(account, this);
}
exports.FolderStorage = FolderStorage;

/**
 * Return true if the given folder type is local-only (i.e. we will
 * not try to sync this folder with the server).
 *
 * @param {String} type
 *   The type of the folderStorage, e.g. 'inbox' or 'localdrafts'.
 */
FolderStorage.isTypeLocalOnly = function(type) {
  if (typeof type !== 'string') {
    throw new Error('isTypeLocalOnly() expects a string, not ' + type);
  }
  return (type === 'outbox' || type === 'localdrafts');
}

FolderStorage.prototype = {
  get hasActiveSlices() {
    return this._slices.length > 0;
  },

  get isLocalOnly() {
    return FolderStorage.isTypeLocalOnly(this.folderMeta.type);
  },

  /**
   * Reset all active slices.
   */
  resetAndRefreshActiveSlices: function() {
    if (!this._slices.length)
      return;
    // This will splice out slices as we go, so work from the back to avoid
    // processing any slice more than once.  (Shuffling of processed slices
    // will occur, but we don't care.)
    for (var i = this._slices.length - 1; i >= 0; i--) {
      var slice = this._slices[i];
      slice.desiredHeaders = $sync.INITIAL_FILL_SIZE;
      slice.reset();
      if (slice.type === 'folder') {
        this._resetAndResyncSlice(slice, true, null);
      }
    }
  },

  /**
   * Called by our owning account to generate lists of dirty blocks to be
   * persisted to the database if we have any dirty blocks.
   *
   * We trigger a cache flush after clearing the set of dirty blocks because
   * this is the first time we can flush the no-longer-dirty blocks and this is
   * an acceptable/good time to clear the cache since we must not be in a mutex.
   */
  generatePersistenceInfo: function() {
    if (!this._dirty)
      return null;
    var pinfo = {
      id: this.folderId,
      headerBlocks: this._dirtyHeaderBlocks,
      bodyBlocks: this._dirtyBodyBlocks,
    };
    logic(this, 'generatePersistenceInfo', { info: pinfo });
    this._dirtyHeaderBlocks = {};
    this._dirtyBodyBlocks = {};
    this._dirty = false;
    this.flushExcessCachedBlocks('persist');
    // Generate a notification that something about this folder has probably
    // changed.  If it was important enough to save us, then it's arguably
    // important enough to tell the front-end about it too.  Plus the I/O
    // overhead is way more costly than throwing some minimal updates at the
    // front-end.
    //
    // (Previously all that could change was our last sync time and so
    // we only did this in markSyncRange().  Now we maintain an unread count
    // too.  And it's likely we'll be adding more values we care about in the
    // future.)
    this._account.universe.__notifyModifiedFolder(this._account,
                                                  this.folderMeta);
    return pinfo;
  },

  _invokeNextMutexedCall: function() {
    var callInfo = this._mutexQueue[0], self = this, done = false;
    this._mutexedCallInProgress = true;
    logic(this, 'mutexedCall_begin', { name: callInfo.name });

    try {
      var mutexedOpDone = function(err) {
        if (done) {
          logic(self, 'tooManyCallbacks', { name: callInfo.name });
          return;
        }
        logic(self, 'mutexedCall_end', { name: callInfo.name });
        logic(self, 'mailslice:mutex-released',
                   { folderId: self.folderId, err: err });

        done = true;
        if (self._mutexQueue[0] !== callInfo) {
          logic(self, 'mutexInvariantFail', {
            callName: callInfo.name,
            mutexName: self._mutexQueue[0].name
          });
          return;
        }
        self._mutexQueue.shift();
        self.flushExcessCachedBlocks('mutex');
        // Although everything should be async, avoid stack explosions by
        // deferring the execution to a future turn of the event loop.
        if (self._mutexQueue.length)
          window.setZeroTimeout(self._invokeNextMutexedCall.bind(self));
        else if (self._slices.length === 0)
          self.folderSyncer.allConsumersDead();
      }

      callInfo.func(mutexedOpDone);
    }
    catch (ex) {
      logic(this, 'mutexedOpErr', { ex: ex });
    }
  },

  /**
   * If you want to modify the state of things in the FolderStorage, or be able
   * to view the state of the FolderStorage without worrying about some other
   * logic mutating its state, then use this to schedule your function to run
   * with (notional) exclusive write access.  Because everything is generally
   * asynchronous, it's assumed your function is still doing work until it calls
   * the passed-in function to indicate it is done.
   *
   * This mutex should not be held longer than required.  Specifically, if error
   * handling determines that we should wait a few seconds to retry a network
   * operation, then the function should mark itself completed and issue a call
   * to runMutexed again in the future once the timeout has elapsed.
   *
   * Keep in mind that there is nothing actually stopping other code from trying
   * to manipulate the database.
   *
   * It's okay to issue reads against the FolderStorage if the value is
   * immutable or there are other protective mechanisms in place.  For example,
   * fetching a message body should always be safe even if a block load needs
   * to occur.  But if you wanted to fetch a header, mutate it, and write it
   * back, then you would want to do all of that with the mutex held; reading
   * the header before holding the mutex could result in a race.
   *
   * @args[
   *   @param[name String]{
   *     A short name to identify what operation this is for debugging purposes.
   *     No private user data or sensitive data should be included in the name.
   *   }
   *   @param[func @func[@args[@param[callWhenDone Function]]]]{
   *     The function to run with (notional) exclusive access to the
   *     FolderStorage.
   *   }
   * ]
   */
  runMutexed: function(name, func) {
    var doRun = this._mutexQueue.length === 0;
    this._mutexQueue.push({ name: name, func: func });

    if (doRun)
      this._invokeNextMutexedCall();
  },

  /**
   * This queues the proper upgrade jobs and updates the version, if necessary
   */
  upgradeIfNeeded: function() {
    if (!this.folderMeta.version || FOLDER_DB_VERSION > this.folderMeta.version) {
      this._account.universe.performFolderUpgrade(this.folderMeta.id);
    }
  },


  _issueNewHeaderId: function() {
    return this._folderImpl.nextId++;
  },

  /**
   * Create an empty header `FolderBlockInfo` and matching `HeaderBlock`.  The
   * `HeaderBlock` will be inserted into the block map, but it's up to the
   * caller to insert the returned `FolderBlockInfo` in the right place.
   */
  _makeHeaderBlock: function ifs__makeHeaderBlock(
      startTS, startUID, endTS, endUID, estSize, ids, headers) {
    var blockId = $a64.encodeInt(this._folderImpl.nextHeaderBlock++),
        blockInfo = {
          blockId: blockId,
          startTS: startTS,
          startUID: startUID,
          endTS: endTS,
          endUID: endUID,
          count: ids ? ids.length : 0,
          estSize: estSize || 0,
        },
        block = {
          ids: ids || [],
          headers: headers || [],
        };
    this._dirty = true;
    this._headerBlocks[blockId] = block;
    this._dirtyHeaderBlocks[blockId] = block;

    // Update the server id mapping if we are maintaining one.
    if (this._serverIdHeaderBlockMapping && headers) {
      var srvMapping = this._serverIdHeaderBlockMapping;
      for (var i = 0; i < headers.length; i++) {
        var header = headers[i];
        if (header.srvid)
          srvMapping[header.srvid] = blockId;
      }
    }

    return blockInfo;
  },

  _insertHeaderInBlock: function ifs__insertHeaderInBlock(header, uid, info,
                                                          block) {
    var idx = bsearchForInsert(block.headers, header, cmpHeaderYoungToOld);
    block.ids.splice(idx, 0, header.id);
    block.headers.splice(idx, 0, header);
    this._dirty = true;
    this._dirtyHeaderBlocks[info.blockId] = block;
    // Insertion does not need to update start/end TS/UID because the calling
    // logic is able to handle it.
  },

  _deleteHeaderFromBlock: function ifs__deleteHeaderFromBlock(uid, info, block) {
    var idx = block.ids.indexOf(uid), header;

    // Whatever we're looking for should absolutely exist; log an error if it
    // does not.  But just silently return since there's little to be gained
    // from blowing up the world.
    if (idx === -1) {
      logic(this, 'badDeletionRequest', {
        header: header,
        uid: uid
      });
      return;
    }
    header = block.headers[idx];

    // - remove, update counts
    if (header.flags && header.flags.indexOf('\\Seen') === -1) {
      this.folderMeta.unreadCount--;
    }

    block.ids.splice(idx, 1);
    block.headers.splice(idx, 1);
    info.estSize -= $sync.HEADER_EST_SIZE_IN_BYTES;
    info.count--;

    this._dirty = true;
    this._dirtyHeaderBlocks[info.blockId] = block;

    // - update endTS/endUID if necessary
    if (idx === 0 && info.count) {
      header = block.headers[0];
      info.endTS = header.date;
      info.endUID = header.id;
    }
    // - update startTS/startUID if necessary
    if (idx === info.count && idx > 0) {
      header = block.headers[idx - 1];
      info.startTS = header.date;
      info.startUID = header.id;
    }
  },

  /**
   * Split the contents of the given header block into a newer and older block.
   * The newer info block will be mutated in place; the older block info will
   * be created and returned.  The newer block is filled with data until it
   * first overflows newerTargetBytes.  This method is responsible for updating
   * the actual containing blocks as well.
   */
  _splitHeaderBlock: function ifs__splitHeaderBlock(splinfo, splock,
                                                    newerTargetBytes) {
    // We currently assume a fixed size, so this is easy.
    var numHeaders = Math.ceil(newerTargetBytes /
                               $sync.HEADER_EST_SIZE_IN_BYTES);
    if (numHeaders > splock.headers.length)
      throw new Error("No need to split!");

    var olderNumHeaders = splock.headers.length - numHeaders,
        olderEndHeader = splock.headers[numHeaders],
        // (This will update the server id mappings for the headers too)
        olderInfo = this._makeHeaderBlock(
                      // Take the start info from the block, because it may have
                      // been extended beyond the header (for an insertion if
                      // we change back to inserting after splitting.)
                      splinfo.startTS, splinfo.startUID,
                      olderEndHeader.date, olderEndHeader.id,
                      olderNumHeaders * $sync.HEADER_EST_SIZE_IN_BYTES,
                      splock.ids.splice(numHeaders, olderNumHeaders),
                      splock.headers.splice(numHeaders, olderNumHeaders));

    var newerStartHeader = splock.headers[numHeaders - 1];
    splinfo.count = numHeaders;
    splinfo.estSize = numHeaders * $sync.HEADER_EST_SIZE_IN_BYTES;
    splinfo.startTS = newerStartHeader.date;
    splinfo.startUID = newerStartHeader.id;
    // this._dirty is already touched by makeHeaderBlock when it dirties the
    // block it creates.
    this._dirtyHeaderBlocks[splinfo.blockId] = splock;

    return olderInfo;
  },

  /**
   * Create an empty header `FolderBlockInfo` and matching `BodyBlock`.  The
   * `BodyBlock` will be inserted into the block map, but it's up to the
   * caller to insert the returned `FolderBlockInfo` in the right place.
   */
  _makeBodyBlock: function ifs__makeBodyBlock(
      startTS, startUID, endTS, endUID, size, ids, bodies) {
    var blockId = $a64.encodeInt(this._folderImpl.nextBodyBlock++),
        blockInfo = {
          blockId: blockId,
          startTS: startTS,
          startUID: startUID,
          endTS: endTS,
          endUID: endUID,
          count: ids ? ids.length : 0,
          estSize: size || 0,
        },
        block = {
          ids: ids || [],
          bodies: bodies || {},
        };
    this._dirty = true;
    this._bodyBlocks[blockId] = block;
    this._dirtyBodyBlocks[blockId] = block;

    if (this._folderImpl.nextBodyBlock %
          $sync.BLOCK_PURGE_EVERY_N_NEW_BODY_BLOCKS === 0 &&
        !this._messagePurgeScheduled) {
      this._messagePurgeScheduled = true;
      this._account.scheduleMessagePurge(this.folderId);
    }

    return blockInfo;
  },

  _insertBodyInBlock: function ifs__insertBodyInBlock(body, id, info, block) {
    function cmpBodyByID(aID, bID) {
      var aDate = (aID === id) ? body.date : block.bodies[aID].date,
          bDate = (bID === id) ? body.date : block.bodies[bID].date,
          d = bDate - aDate;
      if (d)
        return d;
      d = bID - aID;
      return d;
    }

    var idx = bsearchForInsert(block.ids, id, cmpBodyByID);
    block.ids.splice(idx, 0, id);
    block.bodies[id] = body;
    this._dirty = true;
    this._dirtyBodyBlocks[info.blockId] = block;
    // Insertion does not need to update start/end TS/UID because the calling
    // logic is able to handle it.
  },

  _deleteBodyFromBlock: function ifs__deleteBodyFromBlock(id, info, block) {
    // - delete
    var idx = block.ids.indexOf(id);
    var body = block.bodies[id];
    if (idx === -1 || !body) {
      logic(this, 'bodyBlockMissing', { id: id, index: idx, hasBody: !!body });
      return;
    }
    block.ids.splice(idx, 1);
    delete block.bodies[id];
    info.estSize -= body.size;
    info.count--;

    this._dirty = true;
    this._dirtyBodyBlocks[info.blockId] = block;

    // - update endTS/endUID if necessary
    if (idx === 0 && info.count) {
      info.endUID = id = block.ids[0];
      info.endTS = block.bodies[id].date;
    }
    // - update startTS/startUID if necessary
    if (idx === info.count && idx > 0) {
      info.startUID = id = block.ids[idx - 1];
      info.startTS = block.bodies[id].date;
    }
  },

  /**
   * Split the contents of the given body block into a newer and older block.
   * The newer info block will be mutated in place; the older block info will
   * be created and returned.  The newer block is filled with data until it
   * first overflows newerTargetBytes.  This method is responsible for updating
   * the actual containing blocks as well.
   */
  _splitBodyBlock: function ifs__splitBodyBlock(splinfo, splock,
                                                newerTargetBytes) {
    // Save off the start timestamp/uid; these may have been extended beyond the
    // delimiting bodies because of the insertion triggering the split.  (At
    // least if we start inserting after splitting again in the future.)
    var savedStartTS = splinfo.startTS, savedStartUID = splinfo.startUID;

    var newerBytes = 0, ids = splock.ids, newDict = {}, oldDict = {},
        inNew = true, numHeaders = null, i, id, body,
        idxLast = ids.length - 1;
    // loop for new traversal; picking a split-point so that there is at least
    // one item in each block.
    for (i = 0; i < idxLast; i++) {
      id = ids[i],
      body = splock.bodies[id];
      newerBytes += body.size;
      newDict[id] = body;
      if (newerBytes >= newerTargetBytes) {
        i++;
        break;
      }
    }
    // mark the breakpoint; i is pointing at the first old-block message
    splinfo.count = numHeaders = i;
    // and these values are from the last processed new-block message
    splinfo.startTS = body.date;
    splinfo.startUID = id;
    // loop for old traversal
    for (; i < ids.length; i++) {
      id = ids[i];
      oldDict[id] = splock.bodies[id];
    }

    var oldEndUID = ids[numHeaders];
    var olderInfo = this._makeBodyBlock(
      savedStartTS, savedStartUID,
      oldDict[oldEndUID].date, oldEndUID,
      splinfo.estSize - newerBytes,
      // (the older block gets the uids the new/existing block does not want,
      //  leaving `uids` containing only the d
      ids.splice(numHeaders, ids.length - numHeaders),
      oldDict);
    splinfo.estSize = newerBytes;
    splock.bodies = newDict;
    // _makeBodyBlock dirties the block it creates and touches _dirty
    this._dirtyBodyBlocks[splinfo.blockId] = splock;

    return olderInfo;
  },

  /**
   * Flush cached blocks that are unlikely to be used again soon.  Our
   * heuristics for deciding what to keep is simple:
   * - Dirty blocks are always kept; this is required for correctness.
   * - Header blocks that overlap with live `MailSlice` instances are kept.
   *
   * It could also make sense to support some type of MRU tracking, but the
   * complexity is not currently justified since the live `MailSlice` should
   * lead to a near-perfect hit rate on immediate actions and the UI's
   * pre-emptive slice growing should insulate it from any foolish discards
   * we might make.
   *
   * For bodies, since they are larger, and the UI may not always shrink a
   * slice, only keep around one blockInfo of them, which contain the most
   * likely immediately needed blockInfos, for instance a direction reversal
   * in a next/previous navigation.
   */
  flushExcessCachedBlocks: function(debugLabel) {
    // We only care about explicitly folder-backed slices for cache eviction
    // purposes.  Search filters are sparse and would keep way too much in
    // memory.
    var slices = this._slices.filter(function (slice) {
                   return slice.type === 'folder';
                 });
    function blockIntersectsAnySlice(blockInfo) {
      for (var i = 0; i < slices.length; i++) {
        var slice = slices[i];
        if (tupleRangeIntersectsTupleRange(slice, blockInfo)) {
          // Here is some useful debug you can uncomment!
          /*
          console.log('  slice intersect. slice:',
                      slice.startTS, slice.startUID,
                      slice.endTS, slice.endUID, '  block:',
                      blockInfo.startTS, blockInfo.startUID,
                      blockInfo.endTS, blockInfo.endUID);
           */
          return true;
        }
      }
      return false;
    }
    function maybeDiscard(blockType, blockInfoList, loadedBlockInfos,
                          blockMap, dirtyMap, shouldDiscardFunc) {
      // console.warn('!! flushing', blockType, 'blocks because:', debugLabel);

      // Go backwards in array, to allow code to keep a count of
      // blockInfos to keep that favor the most current ones.
      for (var i = loadedBlockInfos.length - 1; i > -1; i--) {
        var blockInfo = loadedBlockInfos[i];
        // do not discard dirty blocks
        if (dirtyMap.hasOwnProperty(blockInfo.blockId)) {
          // console.log('  dirty block:', blockInfo.blockId);
          continue;
        }

        if (shouldDiscardFunc(blockInfo)) {
          // console.log('discarding', blockType, 'block', blockInfo.blockId);
          delete blockMap[blockInfo.blockId];
          loadedBlockInfos.splice(i, 1);
        }
      }
    }

    maybeDiscard(
      'header',
      this._headerBlockInfos,
      this._loadedHeaderBlockInfos,
      this._headerBlocks,
      this._dirtyHeaderBlocks,
      function (blockInfo) {
        // Do not discard blocks that overlap mail slices.
        return !blockIntersectsAnySlice(blockInfo);
      }
    );

    // Keep one body block around if there are open folder slices.  If there are
    // no open slices, discard everything.  (If there are no headers then there
    // isn't really a way to access the bodies.)
    var keepCount = slices.length ? 1 : 0,
        foundCount = 0;

    maybeDiscard(
      'body',
      this._bodyBlockInfos,
      this._loadedBodyBlockInfos,
      this._bodyBlocks,
      this._dirtyBodyBlocks,
      function(blockInfo) {
        // For bodies, want to always purge as front end may decide to
        // never shrink a messages slice, but keep one block around to
        // avoid wasteful DB IO for commonly grouped operations, for
        // example, a next/previous message navigation direction change.
        foundCount += 1;
        return foundCount > keepCount;
      }
    );
  },

  /**
   * Called after a timeout to do cleanup of cached blocks to keep memory
   * low. However, only do the cleanup if there is no more mutex-controlled
   * work so as to keep likely useful cache items still in memory.
   */
  _flushExcessOnTimeout: function() {
    this._flushExcessTimeoutId = 0;
    if (!this.isDead && this._mutexQueue.length === 0) {
      this.flushExcessCachedBlocks('flushExcessOnTimeout');
    }
  },

  /**
   * Discard the cached block that contains the message header or body in
   * question.  This is intended to be used in cases where we want to re-read
   * a header or body from disk to get IndexedDB file-backed Blobs to replace
   * our (likely) memory-backed Blobs.
   *
   * This will log, but not throw, an error in the event the block in question
   * is currently tracked as a dirty block or there is no block that contains
   * the named message.  Both cases indicate an assumption that is being
   * violated.  This should cause unit tests to fail but not break us if this
   * happens out in the real-world.
   *
   * If the block is not currently loaded, no error is triggered.
   *
   * This method executes synchronously.
   *
   * @method _discardCachedBlockUsingDateAndID
   * @param type {'header'|'body'}
   * @param date {Number}
   *   The timestamp of the message in question.
   * @param id {Number}
   *   The folder-local id we allocated for the message.  Not the SUID, not the
   *   server-id.
   */
  _discardCachedBlockUsingDateAndID: function(type, date, id) {
    var scope = logic.subscope(this, { type: type, date: date, id: id });

    var blockInfoList, loadedBlockInfoList, blockMap, dirtyMap;
    logic(scope, 'discardFromBlock');
    if (type === 'header') {
      blockInfoList = this._headerBlockInfos;
      loadedBlockInfoList = this._loadedHeaderBlockInfos;
      blockMap = this._headerBlocks;
      dirtyMap = this._dirtyHeaderBlocks;
    }
    else {
      blockInfoList = this._bodyBlockInfos;
      loadedBlockInfoList = this._loadedBodyBlockInfos;
      blockMap = this._bodyBlocks;
      dirtyMap = this._dirtyBodyBlocks;
    }

    var infoTuple = this._findRangeObjIndexForDateAndID(blockInfoList,
                                                        date, id),
        iInfo = infoTuple[0], info = infoTuple[1];
    // Asking to discard something that does not exist in a block is a
    // violated assumption.  Log an error.
    if (!info) {
      logic(scope, 'badDiscardRequest');
      return;
    }

    var blockId = info.blockId;
    // Nothing to do if the block isn't present
    if (!blockMap.hasOwnProperty(blockId))
      return;

    // Violated assumption if the block is dirty
    if (dirtyMap.hasOwnProperty(blockId)) {
      logic(scope, 'badDiscardRequest');
      return;
    }

    // Discard the block
    delete blockMap[blockId];
    var idxLoaded = loadedBlockInfoList.indexOf(info);
    // Something is horribly wrong if this is -1.
    if (idxLoaded !== -1)
      loadedBlockInfoList.splice(idxLoaded, 1);
  },

  /**
   * Purge messages from disk storage for size and/or time reasons.  This is
   * only used for IMAP folders and we fast-path out if invoked on ActiveSync.
   *
   * This method is invoked as a result of new block allocation as a job /
   * operation run inside a mutex.  This means that we won't be run unless a
   * synchronization job triggers us and that we won't run until that
   * synchronization job completes.  This is important because it means that
   * if a user doesn't use the mail app for a long time it's not like a cron
   * process will purge our synchronized state for everything so that when they
   * next use the mail app all the information will be gone.  Likewise, if the
   * user is disconnected from the net, we won't purge their cached stuff that
   * they are still looking at.  The non-obvious impact on 'archive' folders
   * whose first messages are quite some ways in the past is that the accuracy
   * range for archive folders will have been updated with the current date for
   * at least whatever the UI needed, so we won't go completely purging archive
   * folders.
   *
   * Our strategy is to pick cut points based on a few heuristics and then go
   * with the deepest cut.  Cuts are time-based and always quantized to the
   * subsequent local (timezone compensated) midnight for the server in order to
   * line up with our sync boundaries.  The cut point defines an exclusive range
   * of [0, cutTS).
   *
   * The heuristics are:
   *
   * - Last (online) access: scan accuracy ranges from the oldest until we run
   *   into one that is less than `$sync.BLOCK_PURGE_ONLY_AFTER_UNSYNCED_MS`
   *   milliseconds old.  We clip this against the 'syncRange' interval for the
   *   account.
   *
   * - Hard block limits: If there are more than
   *   `$sync.BLOCK_PURGE_HARD_MAX_BLOCK_LIMIT` header or body blocks, then we
   *   issue a cut-point of the start date of the block at that index.  The date
   *   will then be quantized, which may effectively result in more blocks being
   *   discarded.
   *
   * Deletion is performed by asynchronously, iteratively:
   * - Making sure the oldest header block is loaded.
   * - Checking the oldest header in the block.  If it is more recent than our
   *   cut point, then we are done.
   *
   * What we *do not* do:
   * - We do not do anything about attachments saved to DeviceStorage.  We leave
   *   those around and it's on the user to clean those up from the gallery.
   * - We do not currently take the size of downloaded embedded images into
   *   account.
   *
   * @args[
   *   @param[callback @func[
   *     @args[
   *       @param[numDeleted Number]{
   *         The number of messages deleted.
   *       }
   *       @param[cutTS DateMS]
   *     ]
   *   ]]
   * ]
   */
  purgeExcessMessages: function(callback) {
    this._messagePurgeScheduled = false;
    var cutTS = Math.max(
      this._purge_findLastAccessCutPoint(),
      this._purge_findHardBlockCutPoint(this._headerBlockInfos),
      this._purge_findHardBlockCutPoint(this._bodyBlockInfos));

    if (cutTS === 0) {
      callback(0, cutTS);
      return;
    }

    // Quantize to the subsequent UTC midnight, then apply the timezone
    // adjustment that is what our IMAP database lookup does to account for
    // skew.  (See `ImapFolderConn.syncDateRange`)
    cutTS = quantizeDate(cutTS + DAY_MILLIS);

    // Update the accuracy ranges by nuking accuracy ranges that are no longer
    // relevant and updating any overlapped range.
    var aranges = this._accuracyRanges;
    var splitInfo = this._findFirstObjIndexForDateRange(aranges, cutTS, cutTS);
    // we only need to update a range if there was in fact some overlap.
    if (splitInfo[1]) {
      splitInfo[1].startTS = cutTS;
      // then be sure not to splice ourselves...
      aranges.splice(splitInfo[0] + 1, aranges.length - splitInfo[0]);
    }
    else {
      // do splice things at/after
      aranges.splice(splitInfo[0], aranges.length - splitInfo[0]);
    }

    var headerBlockInfos = this._headerBlockInfos,
        headerBlocks = this._headerBlocks,
        deletionCount = 0,
        // These variables let us detect if the deletion happened fully
        // synchronously and thereby avoid blowing up the stack.
        callActive = false, deleteTriggered = false;
    var deleteNextHeader = function() {
      // if things are happening synchronously, bail out
      if (callActive) {
        deleteTriggered = true;
        return;
      }

      while (true) {
        // - bail if we ran out of blocks somehow
        if (!headerBlockInfos.length) {
          callback(deletionCount, cutTS);
          return;
        }
        // - load the last header block if not currently loaded
        var blockInfo = headerBlockInfos[headerBlockInfos.length - 1];
        if (!this._headerBlocks.hasOwnProperty(blockInfo.blockId)) {
          this._loadBlock('header', blockInfo, deleteNextHeader);
          return;
        }
        // - get the last header, check it
        var headerBlock = this._headerBlocks[blockInfo.blockId],
            lastHeader = headerBlock.headers[headerBlock.headers.length - 1];
        if (SINCE(lastHeader.date, cutTS)) {
          // all done! header is more recent than the cut date
          callback(deletionCount, cutTS);
          return;
        }
        deleteTriggered = false;
        callActive = true;
        deletionCount++;
        this.deleteMessageHeaderAndBodyUsingHeader(lastHeader,
                                                   deleteNextHeader);
        callActive = false;
        if (!deleteTriggered)
          return;
      }
    }.bind(this);
    deleteNextHeader();
  },

  _purge_findLastAccessCutPoint: function() {
    var aranges = this._accuracyRanges,
        cutoffDate = $date.NOW() - $sync.BLOCK_PURGE_ONLY_AFTER_UNSYNCED_MS;
    // When the loop terminates, this is the block we should use to cut, so
    // start with an invalid value.
    var iCutRange;
    for (iCutRange = aranges.length; iCutRange >= 1; iCutRange--) {
      var arange = aranges[iCutRange - 1];
      // We can destroy things that aren't fully synchronized.
      // NB: this case was intended for search-on-server which is not yet
      // implemented.
      if (!arange.fullSync)
        continue;
      if (arange.fullSync.updated > cutoffDate)
        break;
    }
    if (iCutRange === aranges.length)
      return 0;

    var cutTS = aranges[iCutRange].endTS,
        syncRangeMS = $sync.SYNC_RANGE_ENUMS_TO_MS[
                        this._account.accountDef.syncRange] ||
                      $sync.SYNC_RANGE_ENUMS_TO_MS['auto'],
        // Determine the sync horizon, but then subtract an extra day off so
        // that the quantization does not take a bite out of the sync range
        syncHorizonTS = $date.NOW() - syncRangeMS - DAY_MILLIS;

    // If the proposed cut is more recent than our sync horizon, use the sync
    // horizon.
    if (STRICTLY_AFTER(cutTS, syncHorizonTS))
      return syncHorizonTS;
    return cutTS;
  },

  _purge_findHardBlockCutPoint: function(blockInfoList) {
    if (blockInfoList.length <= $sync.BLOCK_PURGE_HARD_MAX_BLOCK_LIMIT)
      return 0;
    return blockInfoList[$sync.BLOCK_PURGE_HARD_MAX_BLOCK_LIMIT].startTS;
  },

  /**
   * Find the first object that contains date ranges whose date ranges contains
   * the provided date.  For use to find the right index in `_accuracyRanges`,
   * `_headerBlockInfos`, and `_bodyBlockInfos`, all of which are pre-sorted.
   *
   * @return[@list[
   *   @param[index Number]{
   *     The index of the Object that contains the date, or if there is no such
   *     structure, the index that it should be inserted at.
   *   }
   *   @param[inside Object]
   * ]]
   */
  _findRangeObjIndexForDate: function ifs__findRangeObjIndexForDate(
      list, date) {
    var i;
    // linear scan for now; binary search later
    for (i = 0; i < list.length; i++) {
      var info = list[i];
      // - Stop if we will never find a match if we keep going.
      // If our date is after the end of this range, then it will never fall
      // inside any subsequent ranges, because they are all chronologically
      // earlier than this range.
      if (SINCE(date, info.endTS))
        return [i, null];
      // therefore BEFORE(date, info.endTS)

      if (SINCE(date, info.startTS))
        return [i, info];
      // (Older than the startTS, keep going.)
    }

    return [i, null];
  },

  /**
   * Find the first object that contains date ranges whose date ranges contains
   * the provided composite date/UID.  For use to find the right index in
   * `_headerBlockInfos`, and `_bodyBlockInfos`, all of which are pre-sorted.
   *
   * @return[@list[
   *   @param[index Number]{
   *     The index of the Object that contains the date, or if there is no such
   *     structure, the index that it should be inserted at.
   *   }
   *   @param[inside Object]
   * ]]
   */
  _findRangeObjIndexForDateAndID: function ifs__findRangeObjIndexForDateAndID(
      list, date, uid) {
    var i;
    // linear scan for now; binary search later
    for (i = 0; i < list.length; i++) {
      var info = list[i];
      // - Stop if we will never find a match if we keep going.
      // If our date is after the end of this range, then it will never fall
      // inside any subsequent ranges, because they are all chronologically
      // earlier than this range.
      // If our date is the same and our UID is higher, then likewise we
      // shouldn't go further because IDs decrease too.
      if (STRICTLY_AFTER(date, info.endTS) ||
          (date === info.endTS && uid > info.endUID))
        return [i, null];
      // therefore BEFORE(date, info.endTS) ||
      //           (date === info.endTS && uid <= info.endUID)
      if (STRICTLY_AFTER(date, info.startTS) ||
          (date === info.startTS && uid >= info.startUID))
        return [i, info];
      // (Older than the startTS, keep going.)
    }

    return [i, null];
  },


  /**
   * Find the first object that contains date ranges that overlaps the provided
   * date range.  Scans from the present into the past.  If endTS is null, get
   * treat it as being a date infinitely far in the future.
   */
  _findFirstObjIndexForDateRange: function ifs__findFirstObjIndexForDateRange(
      list, startTS, endTS) {
    var i;
    // linear scan for now; binary search later
    for (i = 0; i < list.length; i++) {
      var info = list[i];
      // - Stop if we will never find a match if we keep going.
      // If our comparison range starts AFTER the end of this range, then it
      // does not overlap this range and will never overlap any subsequent
      // ranges because they are all chronologically earlier than this range.
      //
      // nb: We are saying that there is no overlap if one range starts where
      // the other one ends.  This is consistent with the inclusive/exclusive
      // definition of since/before and our ranges.
      if (STRICTLY_AFTER(startTS, info.endTS))
        return [i, null];
      // therefore ON_OR_BEFORE(startTS, info.endTS)

      // nb: SINCE(endTS, info.startTS) is not right here because the equals
      // case does not result in overlap because endTS is exclusive.
      if (endTS === null || STRICTLY_AFTER(endTS, info.startTS))
        return [i, info];
      // (no overlap yet)
    }

    return [i, null];
  },

  /**
   * Find the last object that contains date ranges that overlaps the provided
   * date range.  Scans from the past into the present.
   */
  _findLastObjIndexForDateRange: function ifs__findLastObjIndexForDateRange(
      list, startTS, endTS) {
    var i;
    // linear scan for now; binary search later
    for (i = list.length - 1; i >= 0; i--) {
      var info = list[i];
      // - Stop if we will never find a match if we keep going.
      // If our comparison range ends ON OR BEFORE the end of this range, then
      // it does not overlap this range and will never overlap any subsequent
      // ranges because they are all chronologically later than this range.
      //
      // nb: We are saying that there is no overlap if one range starts where
      // the other one ends.  This is consistent with the inclusive/exclusive
      // definition of since/before and our ranges.
      if (ON_OR_BEFORE(endTS, info.startTS))
        return [i + 1, null];
      // therefore STRICTLY_AFTER(endTS, info.startTS)

      // we match in this entry if the start stamp is before the range's end
      if (BEFORE(startTS, info.endTS))
        return [i, info];

      // (no overlap yet)
    }

    return [0, null];
  },


  /**
   * Find the first object in the list whose `date` falls inside the given
   * IMAP style date range.  If `endTS` is null, find the first object whose
   * `date` is at least `startTS`.
   */
  _findFirstObjForDateRange: function ifs__findFirstObjForDateRange(
      list, startTS, endTS) {
    var i;
    var dateComparator = endTS === null ? SINCE : IN_BS_DATE_RANGE;
    for (i = 0; i < list.length; i++) {
      var date = list[i].date;
      if (dateComparator(date, startTS, endTS))
        return [i, list[i]];
    }
    return [i, null];
  },

  /**
   * Find the right block to insert a header/body into using its date and UID.
   * This is an asynchronous operation because we potentially need to load
   * blocks from disk.
   *
   * == Usage patterns
   *
   * - In initial-sync cases and scrolling down through the list, we will
   *   generate messages from a younger-to-older direction.  The insertion point
   *   will then likely occur after the last block.
   * - In update-sync cases, we should be primarily dealing with new mail which
   *   is still retrieved endTS to startTS.  The insertion point will start
   *   before the first block and then move backwards within that block.
   * - Update-sync cases may also encounter messages moved into the folder
   *   from other folders since the last sync.  An archive folder is the
   *   most likely case for this, and we would expect random additions with a
   *   high degree of clustering on message date.
   * - Update-sync cases may experience a lot of apparent message deletion due
   *   to actual deletion or moves to other folders.  These can shrink blocks
   *   and we need to consider block merges to avoid pathological behavior.
   * - Forgetting messages that are no longer being kept alive by sync settings
   *   or apparent user interest.  There's no benefit to churn for the sake of
   *   churn, so we can just forget messages in blocks wholesale when we
   *   experience disk space pressure (from ourselves or elsewhere).  In that
   *   case we will want to traverse from the startTS messages, dropping them and
   *   consolidating blocks as we go until we have freed up enough space.
   *
   * == General strategy
   *
   * - If we fall in an existing block and it won't overflow, use it.
   * - If we fall in an existing block and it would overflow, split it.
   * - If we fall outside existing blocks, check older and newer blocks in that
   *   order for a non-overflow fit.  If we would overflow, pick the existing
   *   block further from the center to perform a split.
   * - If there are no existing blocks at all, create a new one.
   * - When splitting, if we are the first or last block, split 2/3 towards the
   *   center and 1/3 towards the edge.  The idea is that growth is most likely
   *   to occur near the edges, so concentrate the empty space there without
   *   leaving the center blocks so overloaded they can't accept random
   *   additions without further splits.
   * - When splitting, otherwise, split equally-ish.
   *
   * == Block I/O
   *
   * While we can make decisions about where to insert things, we need to have
   * blocks in memory in order to perform the actual splits.  The outcome
   * of splits can't be predicted because the size of things in blocks is
   * only known when the block is loaded.
   *
   * @args[
   *   @param[type @oneof['header' 'body']]
   *   @param[date DateMS]
   *   @param[estSizeCost Number]{
   *     The rough byte cost of whatever we want to stick in a block.
   *   }
   *   @param[thing Object]
   *   @param[blockPickedCallback @func[
   *     @args[
   *       @param[blockInfo FolderBlockInfo]
   *       @param[block @oneof[HeaderBlock BodyBlock]]
   *     ]
   *   ]]{
   *     Callback function to invoke once we have found/created/made-room-for
   *     the thing in the block.  This needs to be a callback because if we need
   *     to perform any splits, we require that the block be loaded into memory
   *     first.  (For consistency and simplicity, we then made us always return
   *     the block.)
   *   }
   * ]
   */
  _insertIntoBlockUsingDateAndUID: function ifs__pickInsertionBlocks(
      type, date, uid, srvid, estSizeCost, thing, blockPickedCallback) {
    var blockInfoList, loadedBlockInfoList, blockMap, makeBlock, insertInBlock,
        splitBlock, serverIdBlockMapping;
    if (type === 'header') {
      blockInfoList = this._headerBlockInfos;
      loadedBlockInfoList = this._loadedHeaderBlockInfos;
      blockMap = this._headerBlocks;
      serverIdBlockMapping = this._serverIdHeaderBlockMapping;
      makeBlock = this._bound_makeHeaderBlock;
      insertInBlock = this._bound_insertHeaderInBlock;
      splitBlock = this._bound_splitHeaderBlock;
    }
    else {
      blockInfoList = this._bodyBlockInfos;
      loadedBlockInfoList = this._loadedBodyBlockInfos;
      blockMap = this._bodyBlocks;
      serverIdBlockMapping = null; // only headers have the mapping
      makeBlock = this._bound_makeBodyBlock;
      insertInBlock = this._bound_insertBodyInBlock;
      splitBlock = this._bound_splitBodyBlock;
    }

    // -- find the current containing block / insertion point
    var infoTuple = this._findRangeObjIndexForDateAndID(blockInfoList,
                                                        date, uid),
        iInfo = infoTuple[0], info = infoTuple[1];

    // For database consistency reasons in the worst-case we want to make sure
    // that we don't update the block info structure until we are also
    // simultaneously updating the block itself.  We use null for sentinel
    // values.  We only update when non-null.
    var updateInfo = {
      startTS: null,
      startUID: null,
      endTS: null,
      endUID: null
    };

    // -- not in a block, find or create one
    if (!info) {
      // - Create a block if no blocks exist at all.
      if (blockInfoList.length === 0) {
        info = makeBlock(date, uid, date, uid);
        blockInfoList.splice(iInfo, 0, info);
        loadedBlockInfoList.push(info);
      }
      // - Is there a trailing/older dude and we fit?
      else if (iInfo < blockInfoList.length &&
               (blockInfoList[iInfo].estSize + estSizeCost <
                 $sync.MAX_BLOCK_SIZE)) {
        info = blockInfoList[iInfo];

        // We are chronologically/UID-ically more recent, so check the end range
        // for expansion needs.
        if (STRICTLY_AFTER(date, info.endTS)) {
          updateInfo.endTS = date;
          updateInfo.endUID = uid;
        }
        else if (date === info.endTS &&
                 uid > info.endUID) {
          updateInfo.endUID = uid;
        }
      }
      // - Is there a preceding/younger dude and we fit?
      else if (iInfo > 0 &&
               (blockInfoList[iInfo - 1].estSize + estSizeCost <
                  $sync.MAX_BLOCK_SIZE)) {
        info = blockInfoList[--iInfo];

        // We are chronologically less recent, so check the start range for
        // expansion needs.
        if (BEFORE(date, info.startTS)) {
          updateInfo.startTS = date;
          updateInfo.startUID = uid;
        }
        else if (date === info.startTS &&
                 uid < info.startUID) {
          updateInfo.startUID = uid;
        }
      }
      // Any adjacent blocks at this point are overflowing, so it's now a
      // question of who to split.  We pick the one further from the center that
      // exists.
      // - Preceding (if possible and) suitable OR the only choice
      else if ((iInfo > 0 && iInfo < blockInfoList.length / 2) ||
               (iInfo === blockInfoList.length)) {
        info = blockInfoList[--iInfo];
        // We are chronologically less recent, so check the start range for
        // expansion needs.
        if (BEFORE(date, info.startTS)) {
          updateInfo.startTS = date;
          updateInfo.startUID = uid;
        }
        else if (date === info.startTS &&
                 uid < info.startUID) {
          updateInfo.startUID = uid;
        }
      }
      // - It must be the trailing dude
      else {
        info = blockInfoList[iInfo];
        // We are chronologically/UID-ically more recent, so check the end range
        // for expansion needs.
        if (STRICTLY_AFTER(date, info.endTS)) {
          updateInfo.endTS = date;
          updateInfo.endUID = uid;
        }
        else if (date === info.endTS &&
                 uid > info.endUID) {
          updateInfo.endUID = uid;
        }
      }
    }
    // (info now definitely exists and is definitely in blockInfoList)

    function processBlock(block) { // 'this' gets explicitly bound
      // -- perform the insertion
      // - update block info
      if (updateInfo.startTS !== null) {
        info.startTS = updateInfo.startTS;
      }
      if (updateInfo.startUID !== null) {
        info.startUID = updateInfo.startUID;
      }
      if (updateInfo.endTS !== null) {
        info.endTS = updateInfo.endTS;
      }
      if (updateInfo.endUID !== null) {
        info.endUID = updateInfo.endUID;
      }
      // We could do this after the split, but this makes things simpler if
      // we want to factor in the newly inserted thing's size in the
      // distribution of bytes.
      info.estSize += estSizeCost;
      info.count++;

      // - actual insertion
      insertInBlock(thing, uid, info, block);

      // -- split if necessary
      if (info.count > 1 && info.estSize >= $sync.MAX_BLOCK_SIZE) {
        // - figure the desired resulting sizes
        var firstBlockTarget;
        // big part to the center at the edges (favoring front edge)
        if (iInfo === 0)
          firstBlockTarget = $sync.BLOCK_SPLIT_SMALL_PART;
        else if (iInfo === blockInfoList.length - 1)
          firstBlockTarget = $sync.BLOCK_SPLIT_LARGE_PART;
        // otherwise equal split
        else
          firstBlockTarget = $sync.BLOCK_SPLIT_EQUAL_PART;


        // - split
        var olderInfo;
        olderInfo = splitBlock(info, block, firstBlockTarget);
        blockInfoList.splice(iInfo + 1, 0, olderInfo);
        loadedBlockInfoList.push(olderInfo);

        // - figure which of the blocks our insertion went in
        if (BEFORE(date, olderInfo.endTS) ||
            ((date === olderInfo.endTS) && (uid <= olderInfo.endUID))) {
          iInfo++;
          info = olderInfo;
          block = blockMap[info.blockId];
        }
      }
      // otherwise, no split necessary, just use it
      if (serverIdBlockMapping && srvid)
        serverIdBlockMapping[srvid] = info.blockId;

      if (blockPickedCallback) {
        blockPickedCallback(info, block);
      }
    }

    if (blockMap.hasOwnProperty(info.blockId))
      processBlock.call(this, blockMap[info.blockId]);
    else
      this._loadBlock(type, info, processBlock.bind(this));
  },

  /**
   * Run deferred calls until we run out of deferred calls or _pendingLoads goes
   * non-zero again.
   */
  _runDeferredCalls: function ifs__runDeferredCalls() {
    while (this._deferredCalls.length && this._pendingLoads.length === 0) {
      var toCall = this._deferredCalls.shift();
      try {
        toCall();
      }
      catch (ex) {
        logic(this, 'callbackErr', { ex: ex });
      }
    }
  },

  _findBlockInfoFromBlockId: function(type, blockId) {
    var blockInfoList;
    if (type === 'header')
      blockInfoList = this._headerBlockInfos;
    else
      blockInfoList = this._bodyBlockInfos;

    for (var i = 0; i < blockInfoList.length; i++) {
      var blockInfo = blockInfoList[i];
      if (blockInfo.blockId === blockId)
        return blockInfo;
    }
    return null;
  },

  /**
   * Request the load of the given block and the invocation of the callback with
   * the block when the load completes.
   */
  _loadBlock: function ifs__loadBlock(type, blockInfo, callback) {
    var blockId = blockInfo.blockId;
    var aggrId = type + blockId;
    if (this._pendingLoads.indexOf(aggrId) !== -1) {
      this._pendingLoadListeners[aggrId].push(callback);
      return;
    }

    var index = this._pendingLoads.length;
    this._pendingLoads.push(aggrId);
    this._pendingLoadListeners[aggrId] = [callback];

    var self = this;
    function onLoaded(block) {
      if (!block)
        logic(self, 'badBlockLoad', { type: type, blockId: blockId });
      logic(self, 'loadBlock_end',
            { type: type, blockId: blockId, block: block });
      if (type === 'header') {
        self._headerBlocks[blockId] = block;
        self._loadedHeaderBlockInfos.push(blockInfo);
      }
      else {
        self._bodyBlocks[blockId] = block;
        self._loadedBodyBlockInfos.push(blockInfo);
      }
      self._pendingLoads.splice(self._pendingLoads.indexOf(aggrId), 1);
      var listeners = self._pendingLoadListeners[aggrId];
      delete self._pendingLoadListeners[aggrId];
      for (var i = 0; i < listeners.length; i++) {
        try {
          listeners[i](block);
        }
        catch (ex) {
          logic(self, 'callbackErr', { ex: ex });
        }
      }

      if (self._pendingLoads.length === 0)
        self._runDeferredCalls();

      // Ask for cleanup of old blocks in case the UI is not shrinking
      // any slices.
      if (self._mutexQueue.length === 0 && !self._flushExcessTimeoutId) {
        self._flushExcessTimeoutId = setTimeout(
          self._bound_flushExcessOnTimeout,
          // Choose 5 seconds, since it is a human-scale value around
          // the order of how long we expect it would take the user
          // to realize they hit the opposite arrow navigation button
          // from what they meant.
          5000
        );
      }
    }

    logic(this, 'loadBlock_begin', { type: type, blockId: blockId });
    if (type === 'header')
      this._imapDb.loadHeaderBlock(this.folderId, blockId, onLoaded);
    else
      this._imapDb.loadBodyBlock(this.folderId, blockId, onLoaded);
  },

  _deleteFromBlock: function ifs__deleteFromBlock(type, date, id, callback) {
    var blockInfoList, loadedBlockInfoList, blockMap, deleteFromBlock;
    var scope = logic.subscope(this, { type: type, date: date, id: id });
    logic(scope, 'deleteFromBlock');
    if (type === 'header') {
      blockInfoList = this._headerBlockInfos;
      loadedBlockInfoList = this._loadedHeaderBlockInfos;
      blockMap = this._headerBlocks;
      deleteFromBlock = this._bound_deleteHeaderFromBlock;
    }
    else {
      blockInfoList = this._bodyBlockInfos;
      loadedBlockInfoList = this._loadedBodyBlockInfos;
      blockMap = this._bodyBlocks;
      deleteFromBlock = this._bound_deleteBodyFromBlock;
    }

    var infoTuple = this._findRangeObjIndexForDateAndID(blockInfoList,
                                                        date, id),
        iInfo = infoTuple[0], info = infoTuple[1];
    // If someone is asking for us to delete something, there should definitely
    // be a block that includes it!
    if (!info) {
      log('badDeletionRequest');
      return;
    }

    function processBlock(block) {
      // The delete function is in charge of updating the start/end TS/ID info
      // because it knows about the internal block structure to do so.
      deleteFromBlock(id, info, block);

      // - Nuke the block if it's empty
      if (info.count === 0) {
        blockInfoList.splice(iInfo, 1);
        delete blockMap[info.blockId];
        loadedBlockInfoList.splice(loadedBlockInfoList.indexOf(info), 1);

        this._dirty = true;
        if (type === 'header')
          this._dirtyHeaderBlocks[info.blockId] = null;
        else
          this._dirtyBodyBlocks[info.blockId] = null;
      }
      if (callback)
        callback();
    }
    if (blockMap.hasOwnProperty(info.blockId))
      processBlock.call(this, blockMap[info.blockId]);
    else
      this._loadBlock(type, info, processBlock.bind(this));
  },

  sliceOpenSearch: function fs_sliceOpenSearch(slice) {
    this._slices.push(slice);
  },

  /**
   * Track a new slice that wants to start from the most recent messages we know
   * about in the folder.
   *
   * If we have previously synchronized the folder, we will return the known
   * messages from the database.  If we are also online, we will trigger a
   * refresh covering the time range of the messages.
   *
   * If we have not previously synchronized the folder, we will initiate
   * synchronization starting from 'now'.
   *
   * For IMAP, an important ramification is that merely opening a slice may not
   * cause us to synchronize all the way up to 'now'.  The slice's consumer will
   * need to keep checking 'atTop' and 'userCanGrowUpwards' and trigger
   * synchronizations until they both go false.  For consumers that really only
   * want us to synchronize the most recent messages, they should either
   * consider purging our storage first or creating a new API that deals with
   * the change in invariants so that gaps in synchronized intervals can exist.
   *
   * Note: previously, we had a function called "sliceOpenFromNow" that would
   * provide guarantees that the slice was accurate and grown from 'now'
   * backwards, but at the very high cost of potentially requiring the user to
   * wait until some amount of synchronization was required.  This resulted in
   * bad UX from a latency perspective and also actually increased
   * synchronization complexity because we had to implement multiple sync
   * heuristics.  Our new approach is much better from a latency perspective but
   * may result in UI complications since we can be so far behind 'now'.
   *
   * @args[
   *   @param[forceRefresh #:optional Boolean]{
   *     Should we ensure that we try and perform a refresh if we are online?
   *     Without this flag, we may decide not to attempt to trigger a refresh
   *     if our data is sufficiently recent.
   *   }
   * ]
   */
  sliceOpenMostRecent: function fs_sliceOpenMostRecent(slice, forceRefresh) {
    // Set the status immediately so that the UI will convey that the request is
    // being processed, even though it might take a little bit to acquire the
    // mutex.
    slice.setStatus('synchronizing', false, true, false,
                    SYNC_START_MINIMUM_PROGRESS);

    var sliceFn = this._sliceOpenMostRecent.bind(this, slice, forceRefresh);

    // Local-only folders don't have a real sync process, so we don't
    // need to hold the mutex when syncing; all mutating operations
    // run in job-ops.
    if (this.isLocalOnly) {
      sliceFn(function fakeReleaseMutex() { /* nothing to do */ });
    } else {
      this.runMutexed('sync', sliceFn);
    }
  },
  _sliceOpenMostRecent: function fs__sliceOpenMostRecent(slice, forceRefresh,
                                                         releaseMutex) {
    // We only put the slice in the list of slices now that we have the mutex
    // in order to avoid having the slice have data fed into it if there were
    // other synchronizations already in progress.
    this._slices.push(slice);
    var doneCallback = function doneSyncCallback(err, reportSyncStatusAs,
                                                 moreExpected) {
      if (!reportSyncStatusAs) {
        if (err)
          reportSyncStatusAs = 'syncfailed';
        else
          reportSyncStatusAs = 'synced';
      }
      if (moreExpected === undefined)
        moreExpected = false;

      slice.waitingOnData = false;
      slice.setStatus(reportSyncStatusAs, true, moreExpected, true);
      this._curSyncSlice = null;

      releaseMutex(err);
    }.bind(this);

    // -- grab from database if we have ever synchronized this folder
    // OR if it's synthetic

    if (this._accuracyRanges.length || this.isLocalOnly) {
      // We can only trigger a refresh if we are online.  Our caller may want to
      // force the refresh, ignoring recency data.  (This logic was too ugly as
      // a straight-up boolean/ternarny combo.)
      var triggerRefresh;
      if (this._account.universe.online && this.folderSyncer.syncable &&
          !this.isLocalOnly) {
        if (forceRefresh)
          triggerRefresh = 'force';
        else
          triggerRefresh = true;
      }
      else {
        triggerRefresh = false;
      }

      slice.waitingOnData = 'db';
      this.getMessagesInImapDateRange(
        0, null, $sync.INITIAL_FILL_SIZE, $sync.INITIAL_FILL_SIZE,
        // trigger a refresh if we are online
        this.onFetchDBHeaders.bind(
          this, slice, triggerRefresh,
          doneCallback, releaseMutex)
      );
      return;
    }
    // (we have never synchronized this folder)

    // -- no work to do if we are offline or synthetic folder
    if (!this._account.universe.online || this.isLocalOnly) {
      doneCallback();
      return;
    }
    // If the folder can't be synchronized right now, just report the sync as
    // blocked. We'll update it soon enough.
    if (!this.folderSyncer.syncable) {
      console.log('Synchronization is currently blocked; waiting...');
      doneCallback(null, 'syncblocked', true);
      return;
    }

    // -- Bad existing data, issue a sync
    var progressCallback = slice.setSyncProgress.bind(slice);
    var syncCallback = function syncCallback(syncMode,
                                             ignoreHeaders) {
      slice.waitingOnData = syncMode;
      if (ignoreHeaders) {
        slice.ignoreHeaders = true;
      }
      this._curSyncSlice = slice;
    }.bind(this);

    // The slice flags are not yet valid; we are primarily interested in having
    // atTop be true when splice notifications for generated as headers are
    // added.
    slice._updateSliceFlags();
    this.folderSyncer.initialSync(
      slice, $sync.INITIAL_SYNC_DAYS,
      syncCallback, doneCallback, progressCallback);
  },

  /**
   * The slice wants more headers.  Grab from the database and/or sync as
   * appropriate to get more headers.  If there is a cost, require an explicit
   * request to perform the sync.
   *
   * We can think of there existing ~2 classes of headers that we might return
   * and our returned headers will always consist of only 1 of these classes at
   * a time.
   *
   * 1a) Headers from the database that are known to be up-to-date because they
   * were recently synchronized or refreshed.
   *
   * 1b) Headers from the database that need to be refreshed because our
   * information is old enough that we might be out of sync with the server.
   * For ActiveSync, no messages will ever be in this state.  For IMAP, this
   * is determined by checking the accuracy ranges and the REFRESH_THRESH_MS
   * constant.  Logic related to this lives in `ImapFolderSyncer`.
   *
   * 2) Headers that we need to synchronize with a growSync.  This only exists
   * for IMAP.
   *
   *
   * The steps we actually perform:
   *
   * - Try and get messages from the database.  If the database knows about
   * any, we will add them to the slice.
   *
   * - If there were any messages and `FolderSyncer.canGrowSync` is true, check
   * the time-span covered by the messages from the database.  If any of the
   * time-span is not sufficiently recently refreshed, issue a refresh over the
   * required time interval to bring those messages up-to-date.
   *
   * - Return if there were any headers.
   *
   * - Issue a grow request.  Start with the day adjacent to the furthest known
   *   message in the direction of growth.  We could alternately try and use
   *   the accuracy range to start even further away.  However, our growth
   *   process likes to keep going until it hits a message, and that's when
   *   it would commit its sync process, so the accuracy range is unlikely
   *   to buy us anything additional at the current time.
   */
  growSlice: function ifs_growSlice(slice, dirMagnitude, userRequestsGrowth) {
    // If the user requested synchronization, provide UI feedback immediately,
    // otherwise, let the method set this state if/when we actually decide to
    // talk to the server.
    if (userRequestsGrowth)
      slice.setStatus('synchronizing', false, true, false,
                      SYNC_START_MINIMUM_PROGRESS);
    this.runMutexed(
      'grow',
      this._growSlice.bind(this, slice, dirMagnitude, userRequestsGrowth));
  },
  _growSlice: function ifs__growSlice(slice, dirMagnitude, userRequestsGrowth,
                                      releaseMutex) {
    var dir, desiredCount;

    var batchHeaders = [];
    // --- process messages
    var gotMessages = function gotMessages(headers, moreExpected) {
      if (headers.length === 0) {
        // no array manipulation required
      }
      if (dir === PASTWARDS) {
        batchHeaders = batchHeaders.concat(headers);
      }
      else { // dir === FUTUREWARDS
        batchHeaders = headers.concat(batchHeaders);
      }

      if (moreExpected)
        return;

      // -- callbacks which may or may not get used
      var doneCallback = function doneGrowCallback(err) {
        // In a refresh, we may have asked for more than we know about in case
        // of a refresh at the edge where the database didn't have all the
        // headers we wanted, so latch it now.
        slice.desiredHeaders = slice.headers.length;
        slice.waitingOnData = false;
        slice.setStatus(err ? 'syncfailed' : 'synced', true, false, true);
        this._curSyncSlice = null;

        releaseMutex(err);
      }.bind(this);

      var progressCallback = slice.setSyncProgress.bind(slice);

      // -- Handle already-known headers
      if (batchHeaders.length) {
        var refreshInterval;

        // - compute refresh interval, if needed
            // offline? don't need a refresh!
        if (!this._account.universe.online ||
            // disabled account? don't need a refresh!
            !this._account.enabled ||
            // can't incrementally refresh? don't need a refresh!
            !this.folderSyncer.canGrowSync) {
          refreshInterval = null;
        }
        else {
          // - Figure out refresh range.
          // We want to make sure that our refresh covers any gaps between the
          // last message in our slice and the first message that we retrieved.

          // NB: endTS is exclusive, so we need to pad it out by a day relative
          // to a known message if we want to make sure it gets covered by the
          // sync range.

          // NB: We quantize to whole dates, but compensate for server timezones
          // so that our refresh actually lines up with the messages we are
          // interested in.  (We want the date in the server's timezone, so we
          // add the timezone to be relative to that timezone.)  We do adjust
          // startTS for the timezone offset in here rather than in the
          // quantization blow below because we do not timezone adjust the oldest
          // full sync date because it's already in the right 'units'.

          var highestLegalEndTS;
          // If we hit the highestLegalEndTS, flag that we should mark endTS as
          // open-ended if we decide we do need to refresh.
          var openEndTS = false;

          var startTS, endTS;
          if (dir === PASTWARDS) {
            var oldestHeader = batchHeaders[batchHeaders.length - 1];
            // If we were always going to sync the entire day, we could
            // subtract an entire day off of slice.startTS, but we are planning
            // to start grabbing less than whole days, so we want to leave it
            // up to checkAccuracyCoverageNeedingRefresh to get rid of any
            // redundant coverage of what we are currently looking at.
            //
            // We do want to cap the date so that we don't re-refresh today and
            // any other intervening days spuriously.  When we sync we only use
            // an endTS of tz-adjusted NOW(), so our rounding up can be too
            // aggressive otherwise and prevent range shrinking.  We call
            // quantizeDateUp afterwards so that if any part of the day is still
            // covered we will have our refresh cover it.
            //
            // NB: We use OPEN_REFRESH_THRESH_MS here because since we are
            // growing past-wards, we don't really care about refreshing things
            // in our future.  This is not the case for FUTUREWARDS.
            highestLegalEndTS = NOW() - $sync.OPEN_REFRESH_THRESH_MS;
            endTS = slice.startTS + $date.DAY_MILLIS;

            // (Note that unlike the else case, we don't need to worry about
            // IMAP_SEARCH_AMBIGUITY since by definition the message can't
            // belong to a time range we haven't searched over.  Well, ignoring
            // daylight-savings-time snafus, but that would be a super edge
            // case we're willing to glitch on.)
            if (this.headerIsOldestKnown(oldestHeader.date, oldestHeader.id)) {
              startTS = this.getOldestFullSyncDate();
            // Because of deletion ambiguity and our desire to make sure we are
            // up-to-date for all of the headers we are telling the user about,
            // we need to subtract off an extra ambiguity interval.  (Otherwise
            // we might only declare a message deleted after a user had already
            // scrolled beyond it!  Oops!)
            } else {
              startTS = oldestHeader.date - $sync.IMAP_SEARCH_AMBIGUITY_MS;
            }
          }
          else { // dir === FUTUREWARDS
            // Unlike PASTWARDS, we do want to be more aggressively up-to-date
            // about the future, so only subtract off the grow range coverage.
            // (If we didn't subtract anything off, quick scrolling back and
            // forth could cause us to refresh more frequently than
            // GROW_REFRESH_THRESH_MS, which is not what we want.)
            highestLegalEndTS = NOW() - $sync.GROW_REFRESH_THRESH_MS;

            var youngestHeader = batchHeaders[0];
            // see the PASTWARDS case for why we don't add a day to this
            startTS = slice.endTS;
            endTS = youngestHeader.date + $date.DAY_MILLIS;
          }
          // We do not want this clamped/saturated case quantized, but we do
          // want all the (other) future-dated endTS cases quantized.
          if (STRICTLY_AFTER(endTS, highestLegalEndTS)) {
            endTS = highestLegalEndTS;
            openEndTS = true;
          }
          else {
            endTS = quantizeDate(endTS);
          }

          // Now, it's not super-likely, but it is possible that because of
          // clock skew or what not that our startTS could end up after our
          // endTS, which we do not want.  Now, we could just clamp this,
          // but since we know the result would be a zero-coverage range,
          // we can just set the refreshInterval to null and be done.
          if (SINCE(startTS, endTS))
            refreshInterval = null;
          else
            refreshInterval = this.checkAccuracyCoverageNeedingRefresh(
              quantizeDate(startTS),
              endTS, // quantized above except when it would go into the future.
              $sync.GROW_REFRESH_THRESH_MS);
        }

        // We could also send the headers in as they come across the wire,
        // but we expect to be dealing in bite-sized requests, so that could
        // be overkill.
        slice.batchAppendHeaders(
          batchHeaders, dir === PASTWARDS ? -1 : 0,
          // !!refreshInterval is more efficient, but this way we can reuse
          // doneCallback() below in the else case simply.
          true);
        // If the database had fewer headers than are requested, it's possible
        // the refresh may give us extras, so allow those to be reported.
        slice.desiredHeaders = Math.max(slice.headers.length, desiredCount);

        if (refreshInterval &&
            // If the values are the same, by definition we have nothing to do,
            // but more importantly, the rounding might not improve the
            // situation, which could result in pathological sync failure on
            // gmail where it returns all the messages it knows about.
            refreshInterval.startTS !== refreshInterval.endTS) {

          // If growth was not requested, make sure we convey server traffic is
          // happening.
          if (!userRequestsGrowth)
            slice.setStatus('synchronizing', false, true, false,
                            SYNC_START_MINIMUM_PROGRESS);

          this.folderSyncer.refreshSync(
            slice, dir,
            quantizeDate(refreshInterval.startTS),
            // If we didn't shrink the endTS and we flagged to be open-ended, then
            // use null.  But if we did shrink the range, then there's no need to
            // go open-ended.
            (openEndTS && refreshInterval.endTS === highestLegalEndTS) ? null
              : quantizeDateUp(refreshInterval.endTS),
            /* origStartTS */ null,
            doneCallback, progressCallback);
        }
        else {
          doneCallback();
        }

        return;
      }

      // -- grow!
      // - do not grow if offline / no support / no user request
      if (!this._account.universe.online ||
          !this.folderSyncer.canGrowSync ||
          !userRequestsGrowth) {
        if (this.folderSyncer.syncable)
          slice.sendEmptyCompletion();
        releaseMutex(null);
        return;
      }

      if (!userRequestsGrowth)
        slice.setStatus('synchronizing', false, true, false,
                        SYNC_START_MINIMUM_PROGRESS);
      this._curSyncSlice = slice;
      slice.waitingOnData = 'grow';
      // We only add the desired count now that we are sure we are growing; if
      // we did it earlier we might boost the desiredHeaders count and then
      // not sync, resulting in the next time we do grow fetching more than we
      // want.
      slice.desiredHeaders += desiredCount;

      // TODO: when we support partial day sync, these growth steps will need
      // to be adjusted by 1-day if day covering the edge message has not been
      // fully synchronized.
      this.folderSyncer.growSync(
        slice, dir,
        dir === PASTWARDS ? quantizeDate(slice.startTS)
                          : quantizeDate(slice.endTS + $date.DAY_MILLIS),
        $sync.INITIAL_SYNC_GROWTH_DAYS,
        doneCallback, progressCallback);
    }.bind(this);

    // The front end may not be calling shrink any more, to reduce
    // complexity for virtual scrolling. So be sure to clear caches
    // that are not needed, to avoid a large memory growth from
    // keeping the header bodies as the user does next/previous
    // navigation.
    if (this._mutexQueue.length === 0) {
      this.flushExcessCachedBlocks('grow');
    }

    // --- request messages
    if (dirMagnitude < 0) {
      dir = FUTUREWARDS;
      desiredCount = -dirMagnitude;

      this.getMessagesAfterMessage(
        slice.endTS, slice.endUID, desiredCount, gotMessages);
    }
    else {
      dir = PASTWARDS;
      desiredCount = dirMagnitude;

      this.getMessagesBeforeMessage(
        slice.startTS, slice.startUID, desiredCount, gotMessages);
    }
  },

  /**
   * A notification from a slice that it is has reduced the span of time that it
   * covers.  We use this to run a cache eviction if there is not currently a
   * mutex held.
   */
  sliceShrunk: function fs_sliceShrunk(slice) {
    if (this._mutexQueue.length === 0)
      this.flushExcessCachedBlocks('shrunk');
  },

  /**
   * Refresh our understanding of the time range covered by the messages
   * contained in the slice, plus expansion to the bounds of our known sync
   * date boundaries if the messages are the first/last known message.
   *
   * In other words, if the most recently known message is from a week ago and
   * that is the most recent message the slice is displaying, then we will
   * expand our sync range to go all the way through today.  Likewise, if the
   * oldest known message is from two weeks ago and is in the slice, but we
   * scanned for messages all the way back to 1990 then we will query all the
   * way back to 1990.  And if we have no messages in the slice, then we use the
   * full date bounds.
   */
  refreshSlice: function fs_refreshSlice(slice) {
    // Set the status immediately so that the UI will convey that the request is
    // being processed, even though it might take a little bit to acquire the
    // mutex.
    slice.setStatus('synchronizing', false, true, false, 0.0);

    var refreshFn = this._refreshSlice.bind(this, slice, false);

    // Local-only folders don't have a real sync process, so we don't
    // need to hold the mutex when syncing; all mutating operations
    // run in job-ops.
    if (this.isLocalOnly) {
      refreshFn(function fakeReleaseMutex() { /* nothing to do */ });
    } else {
      this.runMutexed('refresh', refreshFn);
    }

  },
  _refreshSlice: function fs__refreshSlice(slice, checkOpenRecency,
                                           releaseMutex) {

    var doneCallback = function refreshDoneCallback(err, bisectInfo,
                                                    numMessages) {
      slice._onAddingHeader = null;

      var reportSyncStatusAs = 'synced';
      switch (err) {
      case 'aborted':
      case 'unknown':
        reportSyncStatusAs = 'syncfailed';
        break;
      }

      releaseMutex(err);
      slice.waitingOnData = false;
      slice.setStatus(reportSyncStatusAs, true, false, false, null,
                      newEmailCount);
      return undefined;
    }.bind(this);

    // If the slice is dead, its startTS and endTS will be set to
    // null, so there is no range available to refresh. (See Bug 941991.)
    if (slice.isDead) {
      console.log('MailSlice: Attempted to refresh a dead slice.');
      doneCallback('unknown');
      return;
    }

    slice.waitingOnData = 'refresh';

    var startTS = slice.startTS, endTS = slice.endTS,
        // In the event we grow the startTS to the dawn of time, then we want
        // to also provide the original startTS so that the bisection does not
        // need to scan through years of empty space.
        origStartTS = null,
        // If we are refreshing through 'now', we will count the new messages we
        // hear about and update this.newEmailCount once the sync completes.  If
        // we are performing any othe sync, the value will not be updated.
        newEmailCount = null;

    // - Grow endTS
    // If the endTS lines up with the most recent known message for the folder,
    // then remove the timestamp constraint so it goes all the way to now.
    // OR if we just have no known messages
    if (this.headerIsYoungestKnown(endTS, slice.endUID)) {
      var prevTS = endTS;
      newEmailCount = 0;

      /**
       * Increment our new email count if the following conditions are met:
       * 1. This header is younger than the youngest one before sync
       * 2. and this hasn't already been seen.
       * @param {HeaderInfo} header The header being added.
       */
      slice._onAddingHeader = function(header, currentSlice) {
        if (SINCE(header.date, prevTS) &&
            (!header.flags || header.flags.indexOf('\\Seen') === -1)) {
          newEmailCount += 1;
          if (slice.onNewHeader)
            slice.onNewHeader(header);
        }
      }.bind(this);

      endTS = null;
    }
    else {
      // We want the range to include the day; since it's an exclusive range
      // quantized to midnight, we need to adjust forward a day and then
      // quantize.  We also need to compensate for the timezone; we want this
      // time in terms of server time, so we add the timezone offset.
      endTS = quantizeDate(endTS + DAY_MILLIS);
    }

    // - Grow startTS
    // Grow the start-stamp to include the oldest continuous accuracy range
    // coverage date.  Keep original date around for bisect per above.
    if (this.headerIsOldestKnown(startTS, slice.startUID)) {
      origStartTS = quantizeDate(startTS);
      startTS = this.getOldestFullSyncDate();
    // Because of deletion ambiguity and our desire to make sure we are
    // up-to-date for all of the headers we are telling the user about,
    // we need to subtract off an extra ambiguity interval.  (Otherwise
    // we might only declare a message deleted after a user had already
    // scrolled beyond it!  Oops!)
    } else {
      startTS -= $sync.IMAP_SEARCH_AMBIGUITY_MS;
    }

    // quantize the start date
    if (startTS)
      startTS = quantizeDate(startTS);

    // In the initial open case, we support a constant that allows us to
    // fast-path out without bothering the server.
    if (checkOpenRecency) {
      // We use now less the refresh threshold as the accuracy range end-post;
      // since markSyncRange uses NOW() when 'null' is provided (which it will
      // be for a sync through now), this all works out consistently.
      if (this.checkAccuracyCoverageNeedingRefresh(
             startTS,
             endTS ||
               NOW() - $sync.OPEN_REFRESH_THRESH_MS,
             $sync.OPEN_REFRESH_THRESH_MS) === null) {
        doneCallback();
        return;
      }
    }

    // The choice of PASTWARDS/FUTUREWARDS impacts the direction our chunks
    // happen if we have to bisect (if that happens) and (eventually) the
    // direction new bodies are fetched.
    //
    // There are arguments for both choices:
    //
    // Initial slice open refresh:
    // - PASTWARDS: Show the user the newest messages, but at the cost of a
    //   gap between the known messages and these new messages we are
    //   synchronizing in.  The gap is potentially confusing and ordering could
    //   also be confusing to the user.
    // - FUTUREWARDS: Avoid that gap, having the scrolling make sense.
    //   There is a pathological case here where we are ridiculously out-of-date
    //   and it would take the user a loooong time to sync all the way back up
    //   to now and it would be better to just restart with an initial deepening
    //   sync and/or throw things away.  Arguably, these are cases that should
    //   be explicitly handled outside of us.
    //
    // Manual refresh:
    // - PASTWARDS: Newest first.
    // - FUTUREWARDS: Have the messages show up in the order they were received.
    //
    // We currently choose FUTUREWARDS to avoid the gap and have messages show
    // up chronologically.
    this.folderSyncer.refreshSync(
      slice, FUTUREWARDS, startTS, endTS, origStartTS,
      doneCallback, slice.setSyncProgress.bind(slice));
  },

  _resetAndResyncSlice: function(slice, forceRefresh, releaseMutex) {
    this._slices.splice(this._slices.indexOf(slice), 1);
    if (releaseMutex)
      this._sliceOpenMostRecent(slice, forceRefresh, releaseMutex);
    else
      this.sliceOpenMostRecent(slice, forceRefresh);
  },

  dyingSlice: function ifs_dyingSlice(slice) {
    var idx = this._slices.indexOf(slice);
    this._slices.splice(idx, 1);

    // If this was a folder-backed slice, we potentially can now free up a lot
    // of cached memory, so do that.
    if (slice.type === 'folder') {
      this.flushExcessCachedBlocks('deadslice');
    }

    if (this._slices.length === 0 && this._mutexQueue.length === 0) {
      this.folderSyncer.allConsumersDead();
    }
  },

  /**
   * Receive messages directly from the database (streaming).
   */
  onFetchDBHeaders: function(slice, triggerRefresh, doneCallback, releaseMutex,
                             headers, moreMessagesComing) {
    var triggerNow = false;
    if (!moreMessagesComing && triggerRefresh) {
      moreMessagesComing = true;
      triggerNow = true;
    }

    if (headers.length) {
      // Claim there are more headers coming since we will trigger setStatus
      // right below and we want that to be the only edge transition.
      slice.batchAppendHeaders(headers, -1, true);
    }

    if (!moreMessagesComing) {
      slice.desiredHeaders = slice.headers.length;
      doneCallback();
    }
    else if (triggerNow) {
      slice.desiredHeaders = slice.headers.length;
      // refreshSlice expects this to be null for two reasons:
      // 1) Invariant about only having one sync-like thing happening at a time.
      // 2) We want to generate header deltas rather than initial filling,
      //    and this is keyed off of whether the slice is the current sync
      //    slice.
      this._curSyncSlice = null;
      // We want to have the refresh check its refresh recency range unless we
      // have been explicitly told to force a refresh.
      var checkOpenRecency = triggerRefresh !== 'force';
      this._refreshSlice(slice, checkOpenRecency, releaseMutex);
    }
  },

  sliceQuicksearch: function ifs_sliceQuicksearch(slice, searchParams) {
  },

  getYoungestMessageTimestamp: function() {
    if (!this._headerBlockInfos.length)
      return 0;
    return this._headerBlockInfos[0].endTS;
  },

  /**
   * Return true if the identified header is the most recent known message for
   * this folder as part of our fully-synchronized time-span.  Messages known
   * because of sparse searches do not count.  If null/null is passed and there
   * are no known headers, we will return true.
   */
  headerIsYoungestKnown: function(date, uid) {
    // NB: unlike oldest known, this should not actually be impacted by messages
    // found by search.
    if (!this._headerBlockInfos.length)
      return (date === null && uid === null);
    var blockInfo = this._headerBlockInfos[0];

    return (date === blockInfo.endTS &&
            uid === blockInfo.endUID);
  },

  getOldestMessageTimestamp: function() {
    if (!this._headerBlockInfos.length)
      return 0;
    return this._headerBlockInfos[this._headerBlockInfos.length - 1].startTS;
  },

  /**
   * Return true if the identified header is the oldest known message for this
   * folder as part of our fully-synchronized time-span.  Messages known because
   * of sparse searches do not count.  If null/null is passed and there are no
   * known headers, we will return true.
   */
  headerIsOldestKnown: function(date, uid) {
    // TODO: when we implement search, this logic will need to be more clever
    // to check our full-sync range since we may indeed have cached messages
    // from way in the past.
    if (!this._headerBlockInfos.length)
      return (date === null && uid === null);

    var blockInfo = this._headerBlockInfos[this._headerBlockInfos.length - 1];
    return (date === blockInfo.startTS &&
            uid === blockInfo.startUID);
  },

  /**
   * What is the most recent date we have fully synchronized through?
   */
  getNewestFullSyncDate: function() {
    // If we have any accuracy range, it should be what we want.
    if (this._accuracyRanges.length)
      return this._accuracyRanges[0].endTS;
    // If we have no accuracy ranges, then 0 at least safely indicates we are
    // not up-to-date.
    return 0;
  },

  /**
   * What is the oldest date we have fully synchronized through per our
   * accuracy information?
   */
  getOldestFullSyncDate: function() {
    // Start at the oldest index and run towards the newest until we find a
    // fully synced range or run out of ranges.
    //
    // We used to start at the newest and move towards the oldest since this
    // checked our fully-synced-from-now invariant, but that invariant has now
    // gone by the wayside and is not required for correctness for the purposes
    // of us/our callers.
    var idxAR = this._accuracyRanges.length - 1;
    // Run futurewards in time until we find one without a fullSync or run out
    while (idxAR >= 0 &&
           !this._accuracyRanges[idxAR].fullSync) {
      idxAR--;
    }
    // Sanity-check, use.
    var syncTS;
    if (idxAR >= 0)
      syncTS = this._accuracyRanges[idxAR].startTS;
    else
      syncTS = NOW();
    return syncTS;
  },

  /**
   * Are we synchronized close enough to 'now' so that a refresh of the time
   * interval will include new message received today?  This relies on our
   * IMAP sync generally operating on day granularities.
   */
  syncedToToday: function() {
    if (!this.folderSyncer.canGrowSync)
      return true;

    var newestSyncTS = this.getNewestFullSyncDate();
    return SINCE(newestSyncTS, quantizeDate(NOW()));
  },

  /**
   * Are we synchronized as far back in time as we are able to synchronize?
   *
   * If true, this means that a refresh of the oldest known message should
   * result in the refresh also covering through `$sync.OLDEST_SYNC_DATE.`
   * Once this becomes true for a folder, it will remain true unless we
   * perform a refresh through the dawn of time that needs to be bisected.  In
   * that case we will drop the through-the-end-of-time coverage via
   * `clearSyncedToDawnOfTime`.
   */
  syncedToDawnOfTime: function() {
    if (!this.folderSyncer.canGrowSync)
      return true;

    var oldestSyncTS = this.getOldestFullSyncDate();
    // We add a day to the oldest sync date to allow for some timezone-related
    // slop.  This is done defensively.  Unit tests ensure that our refresh of
    // synced-to-the-dawn-of-time does not result in date drift that would cause
    // the date to slowly move in and escape the slop.
    return ON_OR_BEFORE(oldestSyncTS, $sync.OLDEST_SYNC_DATE + $date.DAY_MILLIS);
  },

  /**
   * Tally and return the number of messages we believe to exist in the folder.
   */
  getKnownMessageCount: function() {
    var count = 0;
    for (var i = 0; i < this._headerBlockInfos.length; i++) {
      var blockInfo = this._headerBlockInfos[i];
      count += blockInfo.count;
    }
    return count;
  },

  /**
   * Retrieve the (ordered list) of messages covering a given IMAP-style date
   * range that we know about.  Use `getMessagesBeforeMessage` or
   * `getMessagesAfterMessage` to perform iteration relative to a known
   * message.
   *
   * @args[
   *   @param[startTS DateMS]{
   *     SINCE-evaluated start timestamp (inclusive).
   *   }
   *   @param[endTS DateMS]{
   *     BEFORE-evaluated end timestamp (exclusive).  If endTS is null, get all
   *     messages since startTS.
   *   }
   *   @param[minDesired #:optional Number]{
   *     The minimum number of messages to return.  We will keep loading blocks
   *     from disk until this limit is reached.
   *   }
   *   @param[maxDesired #:optional Number]{
   *     The maximum number of messages to return.  If there are extra messages
   *     available in a header block after satisfying `minDesired`, we will
   *     return them up to this limit.
   *   }
   *   @param[messageCallback @func[
   *     @args[
   *       @param[headers @listof[HeaderInfo]]
   *       @param[moreMessagesComing Boolean]]
   *     ]
   *   ]
   * ]
   */
  getMessagesInImapDateRange: function ifs_getMessagesInDateRange(
      startTS, endTS, minDesired, maxDesired, messageCallback) {
    var toFill = (minDesired != null) ? minDesired : $sync.TOO_MANY_MESSAGES,
        maxFill = (maxDesired != null) ? maxDesired : $sync.TOO_MANY_MESSAGES,
        self = this,
        // header block info iteration
        iHeadBlockInfo = null, headBlockInfo;

    // find the first header block with the data we want
    var headerPair = this._findFirstObjIndexForDateRange(
                       this._headerBlockInfos, startTS, endTS);
    iHeadBlockInfo = headerPair[0];
    headBlockInfo = headerPair[1];
    if (!headBlockInfo) {
      // no blocks equals no messages.
      messageCallback([], false);
      return;
    }

    function fetchMore() {
      while (true) {
        // - load the header block if required
        if (!self._headerBlocks.hasOwnProperty(headBlockInfo.blockId)) {
          self._loadBlock('header', headBlockInfo, fetchMore);
          return;
        }
        var headerBlock = self._headerBlocks[headBlockInfo.blockId];
        // - use up as many headers in the block as possible
        // (previously used destructuring, but we want uglifyjs to work)
        var headerTuple = self._findFirstObjForDateRange(
                            headerBlock.headers,
                            startTS, endTS),
            iFirstHeader = headerTuple[0], header = headerTuple[1];
        // aw man, no usable messages?!
        if (!header) {
          messageCallback([], false);
          return;
        }
        // (at least one usable message)

        var iHeader = iFirstHeader;
        for (; iHeader < headerBlock.headers.length && maxFill;
             iHeader++, maxFill--) {
          header = headerBlock.headers[iHeader];
          // (we are done if we have found a header earlier than what we want)
          if (BEFORE(header.date, startTS))
            break;
        }
        // (iHeader is pointing at the index of message we don't want)
        // There is no further processing to do if we bailed early.
        if (maxFill && iHeader < headerBlock.headers.length)
          toFill = 0;
        else
          toFill -= iHeader - iFirstHeader;

        if (!toFill) {
        }
        // - There may be viable messages in the next block, check.
        else if (++iHeadBlockInfo >= self._headerBlockInfos.length) {
          // Nope, there are no more messages, nothing left to do.
          toFill = 0;
        }
        else {
          headBlockInfo = self._headerBlockInfos[iHeadBlockInfo];
          // We may not want to go back any farther
          if (STRICTLY_AFTER(startTS, headBlockInfo.endTS))
            toFill = 0;
        }
        // generate the notifications fo what we did create
        messageCallback(headerBlock.headers.slice(iFirstHeader, iHeader),
                        Boolean(toFill));
        if (!toFill)
          return;
        // (there must be some overlap, keep going)
      }
    }

    fetchMore();
  },

  /**
   * Batch/non-streaming version of `getMessagesInDateRange` using an IMAP
   * style date-range for syncing.
   *
   * @args[
   *   @param[allCallback @func[
   *     @args[
   *       @param[headers @listof[HeaderInfo]]
   *     ]
   *   ]
   * ]
   */
  getAllMessagesInImapDateRange: function ifs_getAllMessagesInDateRange(
      startTS, endTS, allCallback) {
    var allHeaders = null;
    function someMessages(headers, moreHeadersExpected) {
      if (allHeaders)
        allHeaders = allHeaders.concat(headers);
      else
        allHeaders = headers;
      if (!moreHeadersExpected)
        allCallback(allHeaders);
    }
    this.getMessagesInImapDateRange(startTS, endTS, null, null, someMessages);
  },

  /**
   * Fetch up to `limit` messages chronologically before the given message
   * (in the direction of 'start').
   *
   * If date/id do not point to a valid message, return messages as
   * though it did point to a valid message (i.e. return messages past
   * that point, as you would probably expect).
   *
   * If date/id are null, it as if the date/id of the most recent message
   * are passed.
   */
  getMessagesBeforeMessage: function(date, id, limit, messageCallback) {
    var toFill = (limit != null) ? limit : $sync.TOO_MANY_MESSAGES, self = this;

    var headerPair, iHeadBlockInfo, headBlockInfo;
    if (date) {
      headerPair = this._findRangeObjIndexForDateAndID(
                     this._headerBlockInfos, date, id);
      iHeadBlockInfo = headerPair[0];
      headBlockInfo = headerPair[1];
    }
    else {
      iHeadBlockInfo = 0;
      headBlockInfo = this._headerBlockInfos[0];
    }

    if (!headBlockInfo) {
      // headBlockInfo will be null if this date/id pair does not fit
      // properly into a block, but iHeadBlockInfo will still point to
      // a location from which we can start looking, and that leads us
      // to one of two cases: Either iHeadBlockInfo points to a valid
      // block (the one immediately after this point), in which case
      // we can just pretend that our targeted date/id resides
      // immediately futureward of the current block; or we've reached
      // the complete end of all blocks and iHeadBlockInfo points past
      // the end of headerBlockInfos, indicating that there are no
      // more messages pastward of our requested point.
      if (iHeadBlockInfo < this._headerBlockInfos.length) {
        // Search in this block.
        headBlockInfo = this._headerBlockInfos[iHeadBlockInfo];
      } else {
        // If this message is older than all the existing blocks,
        // there aren't any messages to return, period, since we're
        // seeking pastward.
        messageCallback([], false);
        return;
      }
    }

    var iHeader = null;
    function fetchMore() {
      while (true) {
        // - load the header block if required
        if (!self._headerBlocks.hasOwnProperty(headBlockInfo.blockId)) {
          self._loadBlock('header', headBlockInfo, fetchMore);
          return;
        }
        var headerBlock = self._headerBlocks[headBlockInfo.blockId];

        // Null means find it by id...
        if (iHeader === null) {
          if (id != null) {
            iHeader = bsearchForInsert(headerBlock.headers, {
              date: date,
              id: id
            }, cmpHeaderYoungToOld);

            if (headerBlock.ids[iHeader] === id) {
              // If we landed exactly on the message we were searching
              // for, we must skip _past_ it, as this method is not
              // intended to return this message, but only ones past it.
              iHeader++;
            } else {
              // If we didn't land on the exact header we sought, we
              // can just start returning results from iHeader onward.
              // since iHeader points to a message immediately beyond
              // the message we sought.
            }
          } else {
            // If we didn't specify an id to search for, we're
            // supposed to pretend that the first message in the block
            // was the one we wanted; in that case, start from index 1.
            iHeader = 1;
          }
        }
        // otherwise we know we are starting at the front of the block.
        else {
          iHeader = 0;
        }

        var useHeaders = Math.min(
              headerBlock.headers.length - iHeader,
              toFill);
        if (iHeader >= headerBlock.headers.length)
          useHeaders = 0;
        toFill -= useHeaders;

        // If there's nothing more to...
        if (!toFill) {
        }
        // - There may be viable messages in the next block, check.
        else if (++iHeadBlockInfo >= self._headerBlockInfos.length) {
          // Nope, there are no more messages, nothing left to do.
          toFill = 0;
        }
        else {
          headBlockInfo = self._headerBlockInfos[iHeadBlockInfo];
        }
        // generate the notifications for what we did create
        messageCallback(headerBlock.headers.slice(iHeader,
                                                  iHeader + useHeaders),
                        Boolean(toFill));
        if (!toFill)
          return;
        // (there must be some overlap, keep going)
      }
    }

    fetchMore();
  },

  /**
   * Fetch up to `limit` messages chronologically after the given message (in
   * the direction of 'end').
   *
   * NOTE: Unlike getMessagesBeforeMessage, this method currently
   * expects date/id to point to a valid message, otherwise we'll
   * raise a badIterationStart error.
   */
  getMessagesAfterMessage: function(date, id, limit, messageCallback) {
    var toFill = (limit != null) ? limit : $sync.TOO_MANY_MESSAGES, self = this;

    var headerPair = this._findRangeObjIndexForDateAndID(
                       this._headerBlockInfos, date, id);
    var iHeadBlockInfo = headerPair[0];
    var headBlockInfo = headerPair[1];

    var scope = logic.subscope(this, { date: date, id: id });

    if (!headBlockInfo) {
      // The iteration request is somehow not current; log an error and return
      // an empty result set.
      logic(scope, 'badIterationStart');
      messageCallback([], false);
      return;
    }

    var iHeader = null;
    function fetchMore() {
      while (true) {
        // - load the header block if required
        if (!self._headerBlocks.hasOwnProperty(headBlockInfo.blockId)) {
          self._loadBlock('header', headBlockInfo, fetchMore);
          return;
        }
        var headerBlock = self._headerBlocks[headBlockInfo.blockId];

        // Null means find it by id...
        if (iHeader === null) {
          iHeader = headerBlock.ids.indexOf(id);
          if (iHeader === -1) {
            logic(scope, 'badIterationStart');
            toFill = 0;
          }
          iHeader--;
        }
        // otherwise we know we are starting at the end of the block (and
        // moving towards the front)
        else {
          iHeader = headerBlock.headers.length - 1;
        }

        var useHeaders = Math.min(iHeader + 1, toFill);
        if (iHeader < 0)
          useHeaders = 0;
        toFill -= useHeaders;

        // If there's nothing more to...
        if (!toFill) {
        }
        // - There may be viable messages in the previous block, check.
        else if (--iHeadBlockInfo < 0) {
          // Nope, there are no more messages, nothing left to do.
          toFill = 0;
        }
        else {
          headBlockInfo = self._headerBlockInfos[iHeadBlockInfo];
        }
        // generate the notifications for what we did create
        var messages = headerBlock.headers.slice(iHeader - useHeaders + 1,
                                                 iHeader + 1);
        messageCallback(messages, Boolean(toFill));
        if (!toFill)
          return;
        // (there must be some overlap, keep going)
      }
    }

    fetchMore();
  },


  /**
   * Mark a given time range as synchronized.  Timestamps are currently UTC
   * day-quantized values that indicate the day range that we have fully
   * synchronized with the server.  The actual time-range of the synchronized
   * messages will be offset by the effective timezone of the server.
   *
   * To re-state in another way: if you take these timestamps and represent them
   * in UTC-0, that's the date we talk to the IMAP server with in terms of SINCE
   * and BEFORE.
   *
   * Note: I did consider doing timezones the right way where we would compute
   * things in the time-zone of the server.  The problem with that is that our
   * timezone for the server is just a guess and the server's timezone can
   * actually change.  And if the timezone changes, then all the dates would end
   * up shifted by a day when quantized, which is distinctly not what we want to
   * happen.
   *
   * @args[
   *   @param[startTS DateMS]
   *   @param[endTS DateMS]
   *   @param[modseq]
   *   @param[updated DateMS]
   * ]
   */
  markSyncRange: function(startTS, endTS, modseq, updated) {
    // If our range was marked open-ended, it's really accurate through now.
    // But we don't want true UTC now, we want the now of the server in terms of
    // IMAP's crazy SINCE/BEFORE quantized date-range.  If it's already tomorrow
    // as far as the server is concerned date-wise, then we need to reflect that
    // here.
    //
    // To really spell it out, let's say that it's currently daylight savings
    // time, we live on the east coast (utc-4), and our server is in Europe
    // (utc+2).
    //
    // Let's say it's 7pm, which is 11pm at utc-0 and 1am at utc+2.  NOW() is
    // going to net us the 11pm value; we need to add the timezone offset of
    // +2 to get to 1am, which is then what we want to use for markSyncRange.
    //
    if (!endTS)
      endTS = NOW();
    if (startTS > endTS)
      throw new Error('Your timestamps are switched!');

    var aranges = this._accuracyRanges;
    function makeRange(start, end, modseq, updated) {
      return {
        startTS: start, endTS: end,
        // let an existing fullSync be passed in instead...
        fullSync: (typeof(modseq) === 'string') ?
          { highestModseq: modseq, updated: updated } :
          { highestModseq: modseq.fullSync.highestModseq,
            updated: modseq.fullSync.updated },
      };
    }

    var newInfo = this._findFirstObjIndexForDateRange(aranges, startTS, endTS),
        oldInfo = this._findLastObjIndexForDateRange(aranges, startTS, endTS),
        newSplits, oldSplits;
    // We need to split the new block if we overlap a block and our end range
    // is not 'outside' the range.
    newSplits = newInfo[1] && STRICTLY_AFTER(newInfo[1].endTS, endTS);
    // We need to split the old block if we overlap a block and our start range
    // is not 'outside' the range.
    oldSplits = oldInfo[1] && BEFORE(oldInfo[1].startTS, startTS);

    var insertions = [],
        delCount = oldInfo[0] - newInfo[0];
    if (oldInfo[1])
      delCount++;

    if (newSplits) {
      // should this just be an effective merge with our insertion?
      if (newInfo[1].fullSync &&
          newInfo[1].fullSync.highestModseq === modseq &&
          newInfo[1].fullSync.updated === updated)
        endTS = newInfo[1].endTS;
      else
        insertions.push(makeRange(endTS, newInfo[1].endTS, newInfo[1]));
    }
    insertions.push(makeRange(startTS, endTS, modseq, updated));
    if (oldSplits) {
      // should this just be an effective merge with what we just inserted?
      if (oldInfo[1].fullSync &&
          oldInfo[1].fullSync.highestModseq === modseq &&
          oldInfo[1].fullSync.updated === updated)
        insertions[insertions.length-1].startTS = oldInfo[1].startTS;
      else
        insertions.push(makeRange(oldInfo[1].startTS, startTS, oldInfo[1]));
    }

    // - merges
    // Consider a merge if there is an adjacent accuracy range in the given dir.
    var newNeighbor = newInfo[0] > 0 ? aranges[newInfo[0] - 1] : null,
        oldAdjust = oldInfo[1] ? 1 : 0,
        oldNeighbor = oldInfo[0] < (aranges.length - oldAdjust) ?
                        aranges[oldInfo[0] + oldAdjust] : null;
    // We merge if our starts and ends line up...
    if (newNeighbor &&
       insertions[0].endTS === newNeighbor.startTS &&
        newNeighbor.fullSync &&
        newNeighbor.fullSync.highestModseq === modseq &&
        newNeighbor.fullSync.updated === updated) {
      insertions[0].endTS = newNeighbor.endTS;
      newInfo[0]--;
      delCount++;
    }
    if (oldNeighbor &&
        insertions[insertions.length-1].startTS === oldNeighbor.endTS &&
        oldNeighbor.fullSync &&
        oldNeighbor.fullSync.highestModseq === modseq &&
        oldNeighbor.fullSync.updated === updated) {
      insertions[insertions.length-1].startTS = oldNeighbor.startTS;
      delCount++;
    }

    aranges.splice.apply(aranges, [newInfo[0], delCount].concat(insertions));

    /*lastSyncedAt depends on current timestamp of the client device
     should not be added timezone offset*/
    this.folderMeta.lastSyncedAt = NOW();
    this._dirty = true;
  },

  /**
   * Mark that the most recent sync is believed to have synced all the messages
   * in the folder.  For ActiveSync, this always happens and is effectively
   * meaningless; it's only an artifact of previous hacks that it calls this at
   * all.  For IMAP, this is an inference that depends on us being up-to-date
   * with the rest of the folder.  However it is also a self-correcting
   * inference since it causes our refreshes to include that time range since we
   * believe it to be safely empty.
   */
  markSyncedToDawnOfTime: function() {
    logic(this, 'syncedToDawnOfTime');

    // We can just expand the first accuracy range structure to stretch to the
    // dawn of time and nuke the rest.
    var aranges = this._accuracyRanges;
    // (If aranges is the empty list, there are deep invariant problems and
    // the exception is desired.)
    aranges[aranges.length - 1].startTS = $sync.OLDEST_SYNC_DATE;

    /*lastSyncedAt depends on current timestamp of the client device
     should not be added timezone offset*/
    this.folderMeta.lastSyncedAt = NOW();
    this._dirty = true;
  },

  /**
   * Clear our indication that we have synced the entire folder through the dawn
   * of time, truncating the time coverage of the oldest accuracy range or
   * dropping it entirely.  It is assumed/required that a call to markSyncRange
   * will follow this call within the same transaction, so the key thing is that
   * we lose the dawn-of-time bit without throwing away useful endTS values.
   */
  clearSyncedToDawnOfTime: function(newOldestTS) {
    var aranges = this._accuracyRanges;
    if (!aranges.length)
      return;
    var lastRange = aranges[aranges.length - 1];
    // Only update the startTS if it leaves a valid accuracy range
    if (STRICTLY_AFTER(lastRange.endTS, newOldestTS)) {
      lastRange.startTS = newOldestTS;
    }
    // Otherwise, pop the range to get rid of the info.  This is a defensive
    // programming thing; we do not expect this case to happen, so we log.
    else {
      logic(this, 'accuracyRangeSuspect', { lastRange: lastRange });
      aranges.pop();
    }
  },

  /**
   * Given a time range, check if we have fully-synchronized data covering
   * that range or part of that range.  Return the smallest possible single
   * range covering all areas that are unsynchronized or were not synchronized
   * recently enough.
   *
   * We only return one range, so in the case we have valid data for Tuesday to
   * Thursday but the requested range is Monday to Friday, we still have to
   * return Monday to Friday because 1 range can't capture Monday to Monday and
   * Friday to Friday at the same time.
   *
   * @args[
   *   @param[startTS DateMS]{
   *     Inclusive range start.
   *   }
   *   @param[endTS DateMS]{
   *     Exclusive range start; consistent with accuracy range rep.
   *   }
   *   @param[threshMS Number]{
   *     The number of milliseconds to use as the threshold value for
   *     determining if a time-range is recent enough.
   *   }
   * ]
   * @return[@oneof[
   *   @case[null]{
   *     Everything is sufficiently up-to-date.  No refresh required.
   *   }
   *   @case[@dict[
   *     @key[startTS DateMS]{
   *       Inclusive start date.
   *     }
   *     @key[endTS DateMS]{
   *       Exclusive end date.
   *     }
   *   ]]
   * ]]
   */
  checkAccuracyCoverageNeedingRefresh: function(startTS, endTS, threshMS) {
    var aranges = this._accuracyRanges, arange,
        newInfo = this._findFirstObjIndexForDateRange(aranges, startTS, endTS),
        oldInfo = this._findLastObjIndexForDateRange(aranges, startTS, endTS),
        recencyCutoff = NOW() - threshMS;
    var result = { startTS: startTS, endTS: endTS };
    if (newInfo[1]) {
      // - iterate from the 'end', trying to push things as far as we can go.
      var i;
      for (i = newInfo[0]; i <= oldInfo[0]; i++) {
        arange = aranges[i];
        // skip out if this range would cause a gap (will not happen in base
        // case.)
        if (BEFORE(arange.endTS, result.endTS))
          break;
        // skip out if this range was not fully updated or the data is too old
        if (!arange.fullSync ||
            BEFORE(arange.fullSync.updated, recencyCutoff))
          break;
        // if the range covers all of us or further than we need, we are done.
        if (ON_OR_BEFORE(arange.startTS, result.startTS))
          return null;
        // the range only partially covers us; shrink our range and keep going
        result.endTS = arange.startTS;
      }
      // - iterate from the 'start', trying to push things as far as we can go.
      // (if we are here, we must not completely cover the range.)
      for (i = oldInfo[0]; i >= 0; i--) {
        arange = aranges[i];
        // skip out if this range would cause a gap
        if (STRICTLY_AFTER(arange.startTS, result.startTS))
          break;
        // skip out if this range was not fully updated or the data is too old
        if (!arange.fullSync ||
            BEFORE(arange.fullSync.updated, recencyCutoff))
          break;
        // the range only partially covers us; shrink our range and keep going
        result.startTS = arange.endTS;
      }
    }
    return result;
  },

  /**
   * Retrieve a full message (header/body) by suid & date. If either the body or
   * header is not present res will be null.
   *
   *    folderStorage.getMessage(suid, date, function(res) {
   *      if (!res) {
   *        // don't do anything
   *      }
   *
   *      res.header;
   *      res.body;
   *    });
   *
   */
  getMessage: function(suid, date, options, callback) {
    if (typeof(options) === 'function') {
      callback = options;
      options = undefined;
    }

    var header;
    var body;
    var pending = 2;

    function next() {
      if (!--pending) {
        if (!body || !header) {
          return callback(null);
        }

        callback({ header: header, body: body });
      }
    }

    this.getMessageHeader(suid, date, function(_header) {
      header = _header;
      next();
    });

    var gotBody = function gotBody(_body) {
      body = _body;
      next();
    };

    if (options && options.withBodyReps) {
      this.getMessageBodyWithReps(suid, date, gotBody);
    } else {
      this.getMessageBody(suid, date, gotBody);
    }
  },

  /**
   * Retrieve a message header by its SUID and date; you would do this if you
   * only had the SUID and date, like in a 'job'.
   */
  getMessageHeader: function ifs_getMessageHeader(suid, date, callback) {
    var id = parseInt(suid.substring(suid.lastIndexOf('/') + 1)),
        posInfo = this._findRangeObjIndexForDateAndID(this._headerBlockInfos,
                                                      date, id);

    if (posInfo[1] === null) {
      logic(this, 'headerNotFound');
      try {
        callback(null);
      }
      catch (ex) {
        logic(this, 'callbackErr', { ex: ex });
      }
      return;
    }
    var headerBlockInfo = posInfo[1], self = this;
    if (!(this._headerBlocks.hasOwnProperty(headerBlockInfo.blockId))) {
      this._loadBlock('header', headerBlockInfo, function(headerBlock) {
          var idx = headerBlock.ids.indexOf(id);
          var headerInfo = headerBlock.headers[idx] || null;
          if (!headerInfo)
            logic(self, 'headerNotFound');
          try {
            callback(headerInfo);
          }
          catch (ex) {
            logic(self, 'callbackErr', { ex: ex });
          }
        });
      return;
    }
    var block = this._headerBlocks[headerBlockInfo.blockId],
        idx = block.ids.indexOf(id),
        headerInfo = block.headers[idx] || null;
    if (!headerInfo)
      logic(this, 'headerNotFound');
    try {
      callback(headerInfo);
    }
    catch (ex) {
      logic(this, 'callbackErr', { ex: ex });
    }
  },

  /**
   * Retrieve multiple message headers.
   */
  getMessageHeaders: function ifs_getMessageHeaders(namers, callback) {
    var pending = namers.length;

    var headers = [];
    var gotHeader = function gotHeader(header) {
      if (header) {
        headers.push(header);
      }

      if (!--pending) {
        callback(headers);
      }
    };
    for (var i = 0; i < namers.length; i++) {
      var namer = namers[i];
      this.getMessageHeader(namer.suid, namer.date, gotHeader);
    }
  },

  /**
   * Add a new message to the database, generating slice notifications.
   *
   * @param header
   * @param [body]
   *   Optional body, exists to hint to slices so that SearchFilter can peek
   *   directly at the body without needing to make an additional request to
   *   look at the body.
   */
  addMessageHeader: function ifs_addMessageHeader(header, body, callback) {
    if (header.id == null || header.suid == null) {
      throw new Error('No valid id: ' + header.id + ' or suid: ' + header.suid);
    }

    if (this._pendingLoads.length) {
      this._deferredCalls.push(this.addMessageHeader.bind(
                                 this, header, body, callback));
      return;
    }

    if (header.flags && header.flags.indexOf('\\Seen') === -1) {
      this.folderMeta.unreadCount++;
    }

    logic(this, 'addMessageHeader',
               { date: header.date, id: header.id, srvid: header.srvid });

    this.headerCount += 1;

    if (this._curSyncSlice) {
      // TODO: make sure the slice knows the true offset of its
      // first header in the folder. Currently the UI never
      // shrinks its slice so this number is always 0 and we can
      // get away without providing that offset for now.
      this._curSyncSlice.headerCount = this.headerCount;
      if (!this._curSyncSlice.ignoreHeaders) {
        this._curSyncSlice.onHeaderAdded(header, body, true, true);
      }
    }

    // - Generate notifications for (other) interested slices
    if (this._slices.length > (this._curSyncSlice ? 1 : 0)) {
      var date = header.date, uid = header.id;
      for (var iSlice = 0; iSlice < this._slices.length; iSlice++) {
        var slice = this._slices[iSlice];
        if (slice === this._curSyncSlice) {
          continue;
        }

        if (slice.type === 'folder') {
          // TODO: make sure the slice knows the true offset of its
          // first header in the folder. Currently the UI never
          // shrinks its slice so this number is always 0 and we can
          // get away without providing that offset for now.
          slice.headerCount = this.headerCount;
        }

        // Note: the following control flow is to decide when to bail; if we
        // make it through the conditionals, the header gets reported to the
        // slice.

        // (if the slice is empty, it cares about any header, so keep going)
        if (slice.startTS !== null) {
          // We never automatically grow a slice into the past if we are full,
          // but we do allow it if not full.
          if (BEFORE(date, slice.startTS)) {
            if (slice.headers.length >= slice.desiredHeaders) {
              continue;
            }
          }
          // We do grow a slice into the present if it's already up-to-date.
          // We do count messages from the same second as our
          else if (SINCE(date, slice.endTS)) {
            // !(covers most recently known message)
            if(!(this._headerBlockInfos.length &&
                 slice.endTS === this._headerBlockInfos[0].endTS &&
                 slice.endUID === this._headerBlockInfos[0].endUID))
              continue;
          }
          else if ((date === slice.startTS &&
                    uid < slice.startUID) ||
                   (date === slice.endTS &&
                    uid > slice.endUID)) {
            continue;
          }
        }
        else {
          // Make sure to increase the number of desired headers so the
          // truncating heuristic won't rule the header out.
          slice.desiredHeaders++;
        }

        if (slice._onAddingHeader) {
          try {
            slice._onAddingHeader(header);
          }
          catch (ex) {
            logic(this, 'callbackErr', { ex: ex });
          }
        }

        try {
          slice.onHeaderAdded(header, body, false, true);
        }
        catch (ex) {
          logic(this, 'callbackErr', { ex: ex });
        }
      }
    }


    this._insertIntoBlockUsingDateAndUID(
      'header', header.date, header.id, header.srvid,
      $sync.HEADER_EST_SIZE_IN_BYTES, header, callback);
  },

  /**
   * Update an existing mesage header in the database, generating slice
   * notifications and dirtying its containing block to cause eventual database
   * writeback.
   *
   * A message header gets updated ONLY because of a change in its flags.  We
   * don't consider this change large enough to cause us to need to split a
   * block.
   *
   * This function can either be used to replace the header or to look it up
   * and then call a function to manipulate the header.
   *
   * Options:
   *   { silent: true }
   *     Don't send slice updates. Used when updating an internal
   *     IMAP-specific flag (imapMissingInSyncRange: slices don't need
   *     to know about it) so that existing tests don't get mad that
   *     we're sending out extra updateMessageHeader events without
   *     expecting them. This flag should be removed in the test
   *     refactoring to allow more fine-grained control over
   *     onHeaderModified assertions.
   */
  updateMessageHeader: function ifs_updateMessageHeader(date, id, partOfSync,
                                                        headerOrMutationFunc,
                                                        body,
                                                        callback,
                                                        opts) {
    // (While this method can complete synchronously, we want to maintain its
    // perceived ordering relative to those that cannot be.)
    if (this._pendingLoads.length) {
      this._deferredCalls.push(this.updateMessageHeader.bind(
                                 this, date, id, partOfSync,
                                 headerOrMutationFunc, body, callback));
      return;
    }

    // We need to deal with the potential for the block having been discarded
    // from memory thanks to the potential asynchrony due to pending loads or
    // on the part of the caller.
    var infoTuple = this._findRangeObjIndexForDateAndID(
                      this._headerBlockInfos, date, id),
        iInfo = infoTuple[0], info = infoTuple[1], self = this;
    function doUpdateHeader(block) {
      var idx = block.ids.indexOf(id), header;
      if (idx === -1) {
        // Call the mutation func with null to let it know we couldn't find the
        // header.
        if (headerOrMutationFunc instanceof Function)
          headerOrMutationFunc(null);
        else
          throw new Error('Failed to find ID ' + id + '!');
      }
      else if (headerOrMutationFunc instanceof Function) {
        // If it returns false it means that the header did not change and so
        // there is no need to mark anything dirty and we can leave without
        // notifying anyone.
        if (!headerOrMutationFunc((header = block.headers[idx])))
          header = null;
      }
      else {
        header = block.headers[idx] = headerOrMutationFunc;
      }
      // only dirty us and generate notifications if there is a header
      if (header) {
        self._dirty = true;
        self._dirtyHeaderBlocks[info.blockId] = block;

        logic(self, 'updateMessageHeader',
              { date: header.date, id: header.id, srvid: header.srvid });

        if (self._slices.length > (self._curSyncSlice ? 1 : 0)) {
          for (var iSlice = 0; iSlice < self._slices.length; iSlice++) {
            var slice = self._slices[iSlice];
            if (partOfSync && slice === self._curSyncSlice)
              continue;
            if (opts && opts.silent) {
              continue;
            }
            if (BEFORE(date, slice.startTS) ||
                STRICTLY_AFTER(date, slice.endTS))
              continue;
            if ((date === slice.startTS &&
                 id < slice.startUID) ||
                (date === slice.endTS &&
                 id > slice.endUID))
              continue;
            try {
              slice.onHeaderModified(header, body);
            }
            catch (ex) {
              logic(this, 'callbackErr', { ex: ex });
            }
          }
        }
      }
      if (callback)
        callback();
    }
    if (!info) {
      if (headerOrMutationFunc instanceof Function)
        headerOrMutationFunc(null);
      else
        throw new Error('Failed to find block containing header with date: ' +
                        date + ' id: ' + id);
    }
    else if (!this._headerBlocks.hasOwnProperty(info.blockId))
      this._loadBlock('header', info, doUpdateHeader);
    else
      doUpdateHeader(this._headerBlocks[info.blockId]);
  },

  /**
   * Retrieve and update a header by locating it
   */
  updateMessageHeaderByServerId: function(srvid, partOfSync,
                                          headerOrMutationFunc, body,
                                          callback) {
    if (this._pendingLoads.length) {
      this._deferredCalls.push(this.updateMessageHeaderByServerId.bind(
        this, srvid, partOfSync, headerOrMutationFunc, body, callback));
      return;
    }

    var blockId = this._serverIdHeaderBlockMapping[srvid];
    if (srvid === undefined) {
      logic(this, 'serverIdMappingMissing', { srvid: srvid });
      return;
    }

    var findInBlock = function findInBlock(headerBlock) {
      var headers = headerBlock.headers;
      for (var i = 0; i < headers.length; i++) {
        var header = headers[i];
        if (header.srvid === srvid) {
          // future work: this method will duplicate some work to re-locate
          // the header; we could try and avoid doing that.
          this.updateMessageHeader(
            header.date, header.id, partOfSync, headerOrMutationFunc, body,
            callback);
          return;
        }
      }
    }.bind(this);

    if (this._headerBlocks.hasOwnProperty(blockId)) {
      findInBlock(this._headerBlocks[blockId]);
    }
    else {
      var blockInfo = this._findBlockInfoFromBlockId('header', blockId);
      this._loadBlock('header', blockInfo, findInBlock);
    }
  },

  /**
   * A notification that an existing header is still up-to-date.
   */
  unchangedMessageHeader: function ifs_unchangedMessageHeader(header) {
    if (this._pendingLoads.length) {
      this._deferredCalls.push(this.unchangedMessageHeader.bind(this, header));
      return;
    }
    // (no block update required)
    if (this._curSyncSlice && !this._curSyncSlice.ignoreHeaders)
      this._curSyncSlice.onHeaderAdded(header, true, false);
  },

  hasMessageWithServerId: function(srvid) {
    if (!this._serverIdHeaderBlockMapping)
      throw new Error('Server ID mapping not supported for this storage!');

    var blockId = this._serverIdHeaderBlockMapping[srvid];
    if (srvid === undefined) {
      logic(this, 'serverIdMappingMissing', { srvid: srvid });
      return false;
    }

    return !!blockId;
  },

  deleteMessageHeaderAndBody: function(suid, date, callback) {
    this.getMessageHeader(suid, date, function(header) {
      if (header)
        this.deleteMessageHeaderAndBodyUsingHeader(header, callback);
      else
        callback();
    }.bind(this));
  },

  deleteMessageHeaderUsingHeader: function(header, callback) {
    if (this._pendingLoads.length) {
      this._deferredCalls.push(this.deleteMessageHeaderUsingHeader.bind(
                               this, header, callback));
      return;
    }

    this.headerCount -= 1;

    if (this._curSyncSlice) {
      // TODO: make sure the slice knows the true offset of its
      // first header in the folder. Currently the UI never
      // shrinks its slice so this number is always 0 and we can
      // get away without providing that offset for now.
      this._curSyncSlice.headerCount = this.headerCount;
      // NB: ignoreHeaders should never be true if we are deleting headers, but
      // just doing this as a simple transform for equivalence purposes.
      // ignoreHeaders should go away.
      if (!this._curSyncSlice.ignoreHeaders) {
        this._curSyncSlice.onHeaderRemoved(header);
      }
    }
    if (this._slices.length > (this._curSyncSlice ? 1 : 0)) {
      for (var iSlice = 0; iSlice < this._slices.length; iSlice++) {
        var slice = this._slices[iSlice];

        if (slice.type === 'folder') {
          // TODO: make sure the slice knows the true offset of its
          // first header in the folder. Currently the UI never
          // shrinks its slice so this number is always 0 and we can
          // get away without providing that offset for now.
          slice.headerCount = this.headerCount;
        }

        if (slice === this._curSyncSlice)
          continue;
        if (BEFORE(header.date, slice.startTS) ||
            STRICTLY_AFTER(header.date, slice.endTS))
          continue;
        if ((header.date === slice.startTS &&
             header.id < slice.startUID) ||
            (header.date === slice.endTS &&
             header.id > slice.endUID))
          continue;

        slice.onHeaderRemoved(header);
      }
    }

    if (this._serverIdHeaderBlockMapping && header.srvid)
      delete this._serverIdHeaderBlockMapping[header.srvid];

    this._deleteFromBlock('header', header.date, header.id, callback);
  },

  deleteMessageHeaderAndBodyUsingHeader: function(header, callback) {
    if (this._pendingLoads.length) {
      this._deferredCalls.push(this.deleteMessageHeaderAndBodyUsingHeader.bind(
                               this, header, callback));
      return;
    }
    this.deleteMessageHeaderUsingHeader(header, function() {
      this._deleteFromBlock('body', header.date, header.id, callback);
    }.bind(this));
  },

  /**
   * Delete a message header and its body using only the server id for the
   * message.  This requires that `serverIdHeaderBlockMapping` was enabled.
   * Currently, the mapping is a naive, always-in-memory (at least as long as
   * the FolderStorage is in memory) map.
   */
  deleteMessageByServerId: function(srvid, callback) {
    if (!this._serverIdHeaderBlockMapping)
      throw new Error('Server ID mapping not supported for this storage!');

    if (this._pendingLoads.length) {
      this._deferredCalls.push(this.deleteMessageByServerId.bind(this, srvid,
                                                                 callback));
      return;
    }

    var blockId = this._serverIdHeaderBlockMapping[srvid];
    if (srvid === undefined) {
      logic(this, 'serverIdMappingMissing', { srvid: srvid });
      return;
    }

    var findInBlock = function findInBlock(headerBlock) {
      var headers = headerBlock.headers;
      for (var i = 0; i < headers.length; i++) {
        var header = headers[i];
        if (header.srvid === srvid) {
          this.deleteMessageHeaderAndBodyUsingHeader(header, callback);
          return;
        }
      }
    }.bind(this);

    if (this._headerBlocks.hasOwnProperty(blockId)) {
      findInBlock(this._headerBlocks[blockId]);
    }
    else {
      var blockInfo = this._findBlockInfoFromBlockId('header', blockId);
      this._loadBlock('header', blockInfo, findInBlock);
    }
  },

  /**
   * Add a message body to the system; you must provide the header associated
   * with the body.
   */
  addMessageBody: function ifs_addMessageBody(header, bodyInfo, callback) {
    if (this._pendingLoads.length) {
      this._deferredCalls.push(this.addMessageBody.bind(
                                 this, header, bodyInfo, callback));
      return;
    }
    logic(this, 'addMessageBody',
          { date: header.date,
            id: header.id,
            srvid: header.srvid,
            bodyInfo: bodyInfo });

    // crappy size estimates where we assume the world is ASCII and so a UTF-8
    // encoding will take exactly 1 byte per character.
    var sizeEst = OBJ_OVERHEAD_EST + NUM_ATTR_OVERHEAD_EST +
                    4 * NULL_ATTR_OVERHEAD_EST;
    function sizifyAddrs(addrs) {
      sizeEst += LIST_ATTR_OVERHEAD_EST;
      if (!addrs)
        return;
      for (var i = 0; i < addrs.length; i++) {
        var addrPair = addrs[i];
        sizeEst += OBJ_OVERHEAD_EST + 2 * STR_ATTR_OVERHEAD_EST +
                     (addrPair.name ? addrPair.name.length : 0) +
                     (addrPair.address ? addrPair.address.length : 0);
      }
    }
    function sizifyAttachments(atts) {
      sizeEst += LIST_ATTR_OVERHEAD_EST;
      if (!atts)
        return;
      for (var i = 0; i < atts.length; i++) {
        var att = atts[i];
        sizeEst += OBJ_OVERHEAD_EST + 2 * STR_ATTR_OVERHEAD_EST +
                     att.name.length + att.type.length +
                     NUM_ATTR_OVERHEAD_EST;
      }
    }
    function sizifyStr(str) {
      sizeEst += STR_ATTR_OVERHEAD_EST + str.length;
    }
    function sizifyStringList(strings) {
      sizeEst += LIST_OVERHEAD_EST;
      if (!strings)
        return;
      for (var i = 0; i < strings.length; i++) {
        sizeEst += STR_ATTR_OVERHEAD_EST + strings[i].length;
      }
    }
    function sizifyBodyRep(rep) {
      sizeEst += LIST_OVERHEAD_EST +
                   NUM_OVERHEAD_EST * (rep.length / 2) +
                   STR_OVERHEAD_EST * (rep.length / 2);
      for (var i = 1; i < rep.length; i += 2) {
        if (rep[i])
          sizeEst += rep[i].length;
      }
    };
    function sizifyBodyReps(reps) {
      if (!reps)
        return;


      sizeEst += STR_OVERHEAD_EST * (reps.length / 2);
      for (var i = 0; i < reps.length; i++) {
        var rep = reps[i];
        if (rep.type === 'html') {
          sizeEst += STR_OVERHEAD_EST + rep.amountDownloaded;
        } else {
          rep.content && sizifyBodyRep(rep.content);
        }
      }
    };

    if (bodyInfo.to)
      sizifyAddrs(bodyInfo.to);
    if (bodyInfo.cc)
      sizifyAddrs(bodyInfo.cc);
    if (bodyInfo.bcc)
      sizifyAddrs(bodyInfo.bcc);
    if (bodyInfo.replyTo)
      sizifyStr(bodyInfo.replyTo);


    sizifyAttachments(bodyInfo.attachments);
    sizifyAttachments(bodyInfo.relatedParts);
    sizifyStringList(bodyInfo.references);
    sizifyBodyReps(bodyInfo.bodyReps);

    bodyInfo.size = sizeEst;

    this._insertIntoBlockUsingDateAndUID(
      'body', header.date, header.id, header.srvid, bodyInfo.size, bodyInfo,
      callback);
  },

  /**
   * Determines if the bodyReps of a given body have been downloaded...
   *
   * Note that for POP3 we will return false here if there are undownloaded
   * attachments even if the body parts are entirely downloaded.  This
   * situation would occur if the body is extremely small and so our snippet
   * fetch is able to fully retrieve the observed body parts.
   *
   *    storage.messageBodyRepsDownloaded(bodyInfo) => true/false
   *
   */
  messageBodyRepsDownloaded: function(bodyInfo) {
    // no reps its as close to downloaded as its going to get.
    if (!bodyInfo.bodyReps || !bodyInfo.bodyReps.length)
      return true;

    var bodyRepsDownloaded = bodyInfo.bodyReps.every(function(rep) {
      return rep.isDownloaded;
    });

    // As noted above, for POP3 we want to also validate the state of the
    // attachments since they need to be downloaded for the whole message to
    // have been downloaded.  Of course, we only want to do this for the inbox;
    // all other folders are synthetic and downloading is nonsensical.
    //
    // Sarcastic hooray for POP3 forcing us to do stuff like this.
    if (this._account.type !== 'pop3' || this.folderMeta.type !== 'inbox') {
      return bodyRepsDownloaded;
    }
    var attachmentsDownloaded = bodyInfo.attachments.every(function(att) {
      return !!att.file;
    });
    return bodyRepsDownloaded && attachmentsDownloaded;
  },

  /**
   * Identical to getMessageBody but will attempt to download all body reps
   * prior to firing its callback .
   */
  getMessageBodyWithReps: function(suid, date, callback) {
    var self = this;
    // try to get the body without any magic
    this.getMessageBody(suid, date, function(bodyInfo) {
      if (!bodyInfo) {
        return callback(bodyInfo);
      }
      if (self.messageBodyRepsDownloaded(bodyInfo)) {
        return callback(bodyInfo);
      }

      // queue a job and return bodyInfo after it completes..
      self._account.universe.downloadMessageBodyReps(suid, date,
                                                     function(err, bodyInfo) {
        // the err (if any) will be logged by the job.
        callback(bodyInfo);
      });
    });
  },

  /**
   * Load the given message body while obeying call ordering consistency rules.
   * If any other calls have gone asynchronous because block loads are required,
   * then this call will wait for those calls to complete first even if we
   * already have the requested body block loaded.  If we haven't gone async and
   * the body is already available, the callback will be invoked synchronously
   * while this function is still on the stack.  So, uh, don't be surprised by
   * that.
   */
  getMessageBody: function ifs_getMessageBody(suid, date, callback) {
    if (this._pendingLoads.length) {
      this._deferredCalls.push(
        this.getMessageBody.bind(this, suid, date, callback));
      return;
    }

    var id = parseInt(suid.substring(suid.lastIndexOf('/') + 1)),
        posInfo = this._findRangeObjIndexForDateAndID(this._bodyBlockInfos,
                                                      date, id);
    if (posInfo[1] === null) {
      logic(this, 'bodyNotFound');
      try {
        callback(null);
      }
      catch (ex) {
        logic(this, 'callbackErr', { ex: ex });
      }
      return;
    }
    var bodyBlockInfo = posInfo[1], self = this;
    if (!(this._bodyBlocks.hasOwnProperty(bodyBlockInfo.blockId))) {
      this._loadBlock('body', bodyBlockInfo, function(bodyBlock) {
          var bodyInfo = bodyBlock.bodies[id] || null;
          if (!bodyInfo)
            logic(self, 'bodyNotFound');
          try {
            callback(bodyInfo);
          }
          catch (ex) {
            logic(self, 'callbackErr', { ex: ex });
          }
        });
      return;
    }
    var block = this._bodyBlocks[bodyBlockInfo.blockId],
        bodyInfo = block.bodies[id] || null;
    if (!bodyInfo)
      logic(this, 'bodyNotFound');
    try {
      callback(bodyInfo);
    }
    catch (ex) {
      logic(this, 'callbackErr', { ex: ex });
    }
  },

  /**
   * Update a message body; this should only happen because of attachments /
   * related parts being downloaded or purged from the system.  This is an
   * asynchronous operation.
   *
   * Right now it is assumed/required that this body was retrieved via
   * getMessageBody while holding a mutex so that the body block must still
   * be around in memory.
   *
   * Additionally the final argument allows you to send an event to any client
   * listening for changes on a given body.
   *
   *    // client listening for a body change event
   *
   *    // ( body is a MessageBody )
   *    body.onchange = function(detail, bodyInfo) {
   *      // detail => { changeDetails: { bodyReps: [0], ... }, value: y }
   *    };
   *
   *    // in the backend
   *
   *    storage.updateMessageBody(
   *      header,
   *      changedBodyInfo,
   *      { changeDetails: { bodyReps: [0], ... }, value: y }
   *    );
   *
   * @method updateMessageBody
   * @param header {HeaderInfo}
   * @param bodyInfo {BodyInfo}
   * @param options {Object}
   * @param [options.flushBecause] {'blobs'}
   *   If present, indicates that we should flush the message body to disk and
   *   read it back from IndexedDB because we are writing Blobs that are not
   *   already known to IndexedDB and we want to replace potentially
   *   memory-backed Blobs with disk-backed Blobs.  This is essential for
   *   memory management.  There are currently no extenuating circumstances
   *   where you should lie to us about this.
   *
   *   This inherently causes saveAccountState to be invoked, so callers should
   *   sanity-check they aren't doing something weird to the database that could
   *   cause a non-coherent state to appear.
   *
   *   If you pass a value for this, you *must* forget your reference to the
   *   bodyInfo you pass in in order for our garbage collection to work!
   * @param eventDetails {Object}
   *   An event details object that describes the changes being made to the
   *   body representation.  This object will be directly reported to clients.
   *   If omitted, no event will be generated.  Only do this if you're doing
   *   something that should not be made visible to anything; like while the
   *   process of attaching
   *
   *   Please be sure to document everything here for now.
   * @param eventDetails.changeDetails {Object}
   *   An object indicating what changed in the body.  All of the following
   *   attributes are optional.  If they aren't present, the thing didn't
   *   change.
   * @param eventDetails.changeDetails.bodyReps {Number[]}
   *   The indices of the bodyReps array that changed.  In general bodyReps
   *   should only be added or modified.  However, in the case of POP3, a
   *   fictitious body part of type 'fake' may be created and may subsequently
   *   be removed.  No index is generated for the removal, but this should
   *   end up being okay because the UI should not reflect the 'fake' bodyRep
   *   into anything.
   * @param eventDetails.changeDetails.attachments {Number[]}
   *   The indices of the attachments array that changed by being added or
   *   modified.  Attachments may be detached; these indices are reported in
   *   detachedAttachments.
   * @param eventDetails.changeDetails.relatedParts {Number[]}
   *   The indices of the relatedParts array that changed by being added or
   *   modified.
   * @param eventDetails.changeDetails.detachedAttachments {Number[]}
   *   The indices of the attachments array that were deleted.  Note that this
   *   should only happen for drafts and no code should really be holding onto
   *   those bodies.  Additionally, the draft headers/bodies get nuked and
   *   re-created every time a draft is saved, so they shouldn't hang around in
   *   general.  However, we really do not want to allow the Blob references to
   *   leak, so we do report this so we can clean them up in clients.  splices
   *   for this case should be performed in the order reported.
   * @param callback {Function}
   *   A callback to be invoked after the body has been updated and after any
   *   body change notifications have been handed off to the MailUniverse.  The
   *   callback receives a reference to the updated BodyInfo object.
   */
  updateMessageBody: function(header, bodyInfo, options, eventDetails,
                              callback) {
    if (typeof(eventDetails) === 'function') {
      callback = eventDetails;
      eventDetails = null;
    }

    // (While this method can complete synchronously, we want to maintain its
    // perceived ordering relative to those that cannot be.)
    if (this._pendingLoads.length) {
      this._deferredCalls.push(this.updateMessageBody.bind(
                                 this, header, bodyInfo, options,
                                 eventDetails, callback));
      return;
    }

    var suid = header.suid;
    var id = parseInt(suid.substring(suid.lastIndexOf('/') + 1));
    var self = this;

    // (called when addMessageBody completes)
    function bodyUpdated() {
      if (options.flushBecause) {
        bodyInfo = null;
        self._account.saveAccountState(
          null, // no transaction to reuse
          function forgetAndReGetMessageBody() {
            // Force the block hosting the body to be discarded from the
            // cache.
            self.getMessageBody(suid, header.date, performNotifications);
          },
          'flushBody');
      }
      else {
        performNotifications();
      }
    }

    function performNotifications(refreshedBody) {
      if (refreshedBody) {
        bodyInfo = refreshedBody;
      }
      if (eventDetails && self._account.universe) {
        self._account.universe.__notifyModifiedBody(
          suid, eventDetails, bodyInfo
        );
      }

      if (callback) {
        callback(bodyInfo);
      }
    }

    // We always recompute the size currently for safety reasons, but as of
    // writing this, changes to attachments/relatedParts will not affect the
    // body size, only changes to body reps.
    this._deleteFromBlock('body', header.date, id, function() {
      self.addMessageBody(header, bodyInfo, bodyUpdated);
    });
  },

  shutdown: function() {
    // reverse iterate since they will remove themselves as we kill them
    for (var i = this._slices.length - 1; i >= 0; i--) {
      this._slices[i].die();
    }
    this.folderSyncer.shutdown();
  },

  /**
   * The folder is no longer known on the server or we are just deleting the
   * account; close out any live connections or processing.  Database cleanup
   * will be handled at the account level so it can go in a transaction with
   * all the other related changes.
   */
  youAreDeadCleanupAfterYourself: function() {
    // XXX close connections, etc.
  },
};


}); // end define
