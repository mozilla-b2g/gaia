define(
  [
    'logic',
    '../a64',
    '../allback',
    '../date',
    '../syncbase',
    '../util',
    'module',
    'require',
    'exports'
  ],
  function(
    logic,
    $a64,
    $allback,
    $date,
    $sync,
    $util,
    $module,
    require,
    exports
  ) {

/**
 * Lazily evaluated modules
 */
var $imaptextparser = null;
var $imapsnippetparser = null;
var $imapbodyfetcher = null;
var $imapchew = null;
var $imapsync = null;

var allbackMaker = $allback.allbackMaker,
    bsearchForInsert = $util.bsearchForInsert,
    bsearchMaybeExists = $util.bsearchMaybeExists,
    cmpHeaderYoungToOld = $util.cmpHeaderYoungToOld,
    DAY_MILLIS = $date.DAY_MILLIS,
    NOW = $date.NOW,
    BEFORE = $date.BEFORE,
    ON_OR_BEFORE = $date.ON_OR_BEFORE,
    SINCE = $date.SINCE,
    TIME_DIR_AT_OR_BEYOND = $date.TIME_DIR_AT_OR_BEYOND,
    TIME_DIR_ADD = $date.TIME_DIR_ADD,
    TIME_DIR_DELTA = $date.TIME_DIR_DELTA,
    makeDaysAgo = $date.makeDaysAgo,
    makeDaysBefore = $date.makeDaysBefore,
    quantizeDate = $date.quantizeDate,
    PASTWARDS = 1, FUTUREWARDS = -1;

/**
 * Compact an array in-place with nulls so that the nulls are removed.  This
 * is done by a scan with an adjustment delta and a final splice to remove
 * the spares.
 */
function compactArray(arr) {
  // this could also be done with a write pointer.
  var delta = 0, len = arr.length;
  for (var i = 0; i < len; i++) {
    var obj = arr[i];
    if (obj === null) {
      delta++;
      continue;
    }
    if (delta)
      arr[i - delta] = obj;
  }
  if (delta)
    arr.splice(len - delta, delta);
  return arr;
}

/**
 * Number of bytes to fetch from the server for snippets.
 */
var NUMBER_OF_SNIPPET_BYTES = 256;

/**
 * Maximum bytes to request from server in a fetch request (max uint32)
 */
var MAX_FETCH_BYTES = (Math.pow(2, 32) - 1);

/**
 * Folder connections do the actual synchronization logic.  They are associated
 * with one or more `ImapSlice` instances that issue the requests that trigger
 * synchronization.  Storage is handled by `FolderStorage` instances.  All of
 * the connection life-cycle nitty-gritty is handled by the `ImapAccount`.
 *
 * == Progress
 *
 * Our progress break-down is:
 * - [0.0, 0.1]: Getting the IMAP connection.
 * - (0.1, 0.25]: Getting usable SEARCH results.  Bisect back-off does not
 *     update progress.
 * - (0.25, 1.0]: Fetching revised flags, headers, and bodies.  Since this
 *     is primarily a question of network latency, we weight things based
 *     on round-trip requests required with reduced cost for number of packets
 *     required.
 *   - Revised flags: 20 + 1 * number of known headers
 *   - New headers: 20 + 5 * number of new headers
 *   - Bodies: 30 * number of new headers
 *
 * == IDLE
 *
 * We plan to IDLE in folders that we have active slices in.  We are assuming
 * the most basic IDLE implementation where it will tell us when the number
 * of messages increases (EXISTS), or decreases (EXPUNGE and EXISTS), with no
 * notifications when flags change.  (This is my current understanding of how
 * gmail operates from internet searches; we're not quite yet to protocol
 * experimentation yet.)
 *
 * The idea is accordingly that we will use IDLE notifications as a hint that
 * we should do a SEARCH for new messages.  It is that search that will update
 * our accuracy information and only that.
 */
function ImapFolderConn(account, storage) {
  this._account = account;
  this._storage = storage;

  logic.defineScope(this, 'ImapFolderConn', {
    accountId: account.id,
    folderId: storage.folderId
  });

  this._conn = null;
  this.box = null;

  this._deathback = null;
}
ImapFolderConn.prototype = {
  /**
   * Acquire a connection and invoke the callback once we have it and we have
   * entered the folder.  This method should only be called when running
   * inside `runMutexed`.
   *
   * @args[
   *   @param[callback @func[
   *     @args[
   *       @param[folderConn ImapFolderConn]
   *       @param[storage FolderStorage]
   *     ]
   *   ]]
   *   @param[deathback Function]{
   *     Invoked if the connection dies.
   *   }
   *   @param[label String]{
   *     A debugging label to name the purpose of the connection.
   *   }
   *   @param[dieOnConnectFailure #:optional Boolean]{
   *     See `ImapAccount.__folderDemandsConnection`.
   *   }
   * ]
   */
  acquireConn: function(callback, deathback, label, dieOnConnectFailure) {
    var self = this;
    this._deathback = deathback;
    this._account.__folderDemandsConnection(
      this._storage.folderId, label,
      function gotconn(conn) {
        self._conn = conn;
        // Now we have a connection, but it's not in the folder.
        // (If we were doing fancier sync like QRESYNC, we would not enter
        // in such a blase fashion.)
        self._conn.selectMailbox(self._storage.folderMeta.path,
                           function openedBox(err, box) {
            if (err) {
              console.error('Problem entering folder',
                            self._storage.folderMeta.path);
              self._conn = null;
              // hand the connection back, noting a resource problem
              self._account.__folderDoneWithConnection(
                self._conn, false, true);
              if (self._deathback) {
                var deathback = self._deathback;
                self.clearErrorHandler();
                deathback();
              }
              return;
            }
            self.box = box;
            callback(self, self._storage);
          });
      },
      function deadconn() {
        self._conn = null;
        if (self._deathback) {
          var deathback = self._deathback;
          self.clearErrorHandler();
          deathback();
        }
      },
      dieOnConnectFailure);
  },

  relinquishConn: function() {
    if (!this._conn)
      return;

    this.clearErrorHandler();
    this._account.__folderDoneWithConnection(this._conn, true, false);
    this._conn = null;
  },

  /**
   * If no connection, acquires one and also sets up
   * deathback if connection is lost.
   *
   * See `acquireConn` for argument docs.
   */
  withConnection: function (callback, deathback, label, dieOnConnectFailure) {
    if (!this._conn) {
      this.acquireConn(function () {
        this.withConnection(callback, deathback, label);
      }.bind(this), deathback, label, dieOnConnectFailure);
      return;
    }

    this._deathback = deathback;
    callback(this);
  },

  /**
   * Resets error handling that may be triggered during
   * loss of connection.
   */
  clearErrorHandler: function () {
    this._deathback = null;
  },

  reselectBox: function(callback) {
    this._conn.selectMailbox(this._storage.folderMeta.path, callback);
  },

  /**
   * Perform a SEARCH for the purposes of folder synchronization.  In the event
   * we are unable to reach the server (we are offline, the server is down,
   * nework troubles), the `abortedCallback` will be invoked.  Note that it can
   * take many seconds for us to conclusively fail to reach the server.
   *
   * Track an isRetry flag to ensure we don't fall into an infinite retry loop.
   */
  _timelySyncSearch: function(searchOptions, searchedCallback,
                              abortedCallback, progressCallback, isRetry) {
    var gotSearchResponse = false;

    // If we don't have a connection, get one, then re-call.
    if (!this._conn) {
      // XXX the abortedCallback should really only be used for the duration
      // of this request, but it will end up being used for the entire duration
      // our folder holds on to the connection.  This is not a great idea as
      // long as we are leaving the IMAP connection idling in the folder (which
      // causes us to not release the connection back to the account).  We
      // should tie this to the mutex or something else transactional.
      this.acquireConn(
        this._timelySyncSearch.bind(this,
                                    searchOptions, searchedCallback,
                                    abortedCallback, progressCallback,
                                    /* isRetry: */ isRetry),
        abortedCallback, 'sync', true);
      return;
    }
    // We do have a connection. Hopefully the connection is still
    // valid and functional. However, since this connection may have
    // been hanging around a while, sending data now might trigger a
    // connection reset notification. In other words, if the
    // connection has gone stale, we want to grab a new connection and
    // retry before aborting.
    else {
      if (!isRetry) {
        var origAbortedCallback = abortedCallback;
        abortedCallback = (function() {
          // Here, we've acquired an already-connected socket. If we
          // were already connected, but failed to receive a response
          // from the server, this socket is effectively dead. In that
          // case, retry the SEARCH once again with a fresh connection,
          // if we haven't already retried the request.
          if (!gotSearchResponse) {
            console.warn('Broken connection for SEARCH. Retrying.');
            this._timelySyncSearch(searchOptions, searchedCallback,
                                   origAbortedCallback, progressCallback,
                                   /* isRetry: */ true);
          }
          // Otherwise, we received an error from this._conn.search
          // below (i.e. there was a legitimate server problem), or we
          // already retried, so we should actually give up.
          else {
            origAbortedCallback();
          }
        }.bind(this));
      }
      this._deathback = abortedCallback;
    }

    // Having a connection is 10% of the battle
    if (progressCallback)
      progressCallback(0.1);

    // Gmail IMAP servers cache search results until your connection
    // gets notified of new messages via an unsolicited server
    // response. Sending a command like NOOP is required to flush the
    // cache and force SEARCH to return new messages that have just
    // been received. Other IMAP servers don't need this as far as we know.
    // See <https://bugzilla.mozilla.org/show_bug.cgi?id=933079>.
    if (this._account.isGmail) {
      this._conn.exec('NOOP');
    }

    this._conn.search(searchOptions, { byUid: true }, function(err, uids) {
        gotSearchResponse = true;
        if (err) {
          console.error('Search error on', searchOptions, 'err:', err);
          abortedCallback();
          return;
        }
        searchedCallback(uids);
      });
  },

  syncDateRange: function() {
    var args = Array.slice(arguments);
    var self = this;

    require(['imap/protocol/sync'], function(_sync) {
      $imapsync = _sync;
      (self.syncDateRange = self._lazySyncDateRange).apply(self, args);
    });
  },

  /**
   * Perform a search to find all the messages in the given date range.
   * Meanwhile, load the set of messages from storage.  Infer deletion of the
   * messages we already know about that should exist in the search results but
   * do not.  Retrieve information on the messages we don't know anything about
   * and update the metadata on the messages we do know about.
   *
   * An alternate way to accomplish the new/modified/deleted detection for a
   * range might be to do a search over the UID range of new-to-us UIDs and
   * then perform retrieval on what we get back.  We would do a flag fetch for
   * all the UIDs we already know about and use that to both get updated
   * flags and infer deletions from UIDs that don't report back.  Except that
   * might not work because the standard doesn't seem to say that if we
   * specify gibberish UIDs that it should keep going for the UIDs that are
   * not gibberish.  Also, it's not clear what the performance impact of the
   * additional search constraint might be on server performance.  (Of course,
   * if the server does not have an index on internaldate, these queries are
   * going to be very expensive and the UID limitation would probably be a
   * mercy to the server.)
   *
   * IMAP servers do not treat the SINCE and BEFORE options to IMAP
   * SEARCH consistently. Because we compare messages in chunks of
   * time-ranges, a message may seem like it has been deleted, when it
   * actually just fell into the adjacent range bucket (Bug 886534).
   * To correct for this, we do the following:
   *
   * 1. When we sync (whether PASTWARDS or FUTUREWARDS), we include
   *    messages from a bit before and after the range we asked the
   *    server for.

   * 2. Compare those messages to the list the server returned. For
   *    any messages which we have locally, but the server did not
   *    return:
   *
   *    a) Delete any messages which are unambiguously within our
   *       current time range.
   *
   *    b) Mark any messages we expected to see (but didn't) with an
   *       indicator saying "we asked the server for messages in this
   *       time range, but we couldn't find it". If a message was
   *       already missing, expand the range to cover the current
   *       range also, indicating that the message still wasn't found
   *       after a wider search.
   *
   *    c) Inspect the "missing range" of each message. If the range
   *       covers at least a day before and after the header's date,
   *       delete the message. The server didn't return it to us even
   *       though we checked a full day before and after the message.
   *
   *    d) If the server returns the message in a sync and we haven't
   *       deleted it yet, clear the "missing" flag and start over.
   *
   * 3. Because we always sync time ranges farther into the past to
   *    show the user new messages, the ambiguity between "deleted or
   *    just hidden" disappears as we get information from continued
   *    syncs.
   *
   * TLDR: Messages on the ends of SEARCH ranges may fall into
   *       adjacent sync ranges. Don't freak out and delete a message
   *       just because it didn't show up in this exact range we asked
   *       for. Only delete the message if we checked all around where
   *       it was supposed to show up, and it never did.
   *
   * @args[
   *   @param[startTS @oneof[null DateMS]]{
   *     If non-null, inclusive "SINCE" constraint to use, otherwise the
   *     constraint is omitted.
   *   }
   *   @param[endTS @oneof[null DateMS]]{
   *     If non-null, exclusive "BEFORE" constraint to use, otherwise the
   *     constraint is omitted.
   *   }
   * ]
   */
  _lazySyncDateRange: function(startTS, endTS, accuracyStamp,
                               doneCallback, progressCallback) {

    var scope = logic.subscope(this, { startTS: startTS, endTS: endTS });

    if (startTS && endTS && SINCE(startTS, endTS)) {
      logic(scope, 'illegalSync');
      doneCallback('invariant');
      return;
    }

    var self = this;
    var storage = self._storage;
    var completed = false;

    console.log('syncDateRange:', startTS, endTS);
    logic(scope, 'syncDateRange_begin');

    // IMAP Search

    // We don't care about deleted messages, it's best that we're not
    // aware of them. However, it's important to keep in mind that
    // this means that EXISTS provides us with an upper bound on the
    // messages in the folder since we are blinding ourselves to
    // deleted messages.
    var searchOptions = { not: { deleted: true } };
    if (startTS) {
      searchOptions.since = new Date(startTS);
    }
    if (endTS) {
      searchOptions.before = new Date(endTS);
    }

    var imapSearchPromise = new Promise(function(resolve) {
      this._timelySyncSearch(
        searchOptions,
        resolve,
        function abortedSearch() {
          if (completed)
            return;
          completed = true;
          logic(scope, 'syncDateRange_end', {
            full: 0, flags: 0, deleted: 0
          });
          doneCallback('aborted');
        }.bind(this),
        progressCallback,
        /* isRetry: */ false);
    }.bind(this));

    // Database Fetch

    // Fetch messages from the database, extending the search by a day
    // on either side to prevent timezone-related problems (bug 886534).

    var dbStartTS = (startTS ? startTS - $sync.IMAP_SEARCH_AMBIGUITY_MS : null);
    var dbEndTS = (endTS ? endTS + $sync.IMAP_SEARCH_AMBIGUITY_MS : null);
    logic(scope, 'database-lookup', {
      dbStartTS: dbStartTS,
      dbEndTS: dbEndTS
    });
    var databaseFetchPromise = new Promise(function(resolve) {
      storage.getAllMessagesInImapDateRange(dbStartTS, dbEndTS, resolve);
    });

    // Combine the results:

    Promise.all([
      imapSearchPromise,
      databaseFetchPromise
    ]).then(function(results) {
      var serverUIDs = results[0];
      var dbHeaders = results[1];
      var effectiveEndTS = endTS || quantizeDate(NOW() + DAY_MILLIS);
      var curDaysDelta = Math.round((effectiveEndTS - startTS) / DAY_MILLIS);

      // ----------------------------------------------------------------
      // BISECTION SPECIAL CASE: If we have a lot of messages to
      // process and we're searching more than one day, we can shrink
      // our search.

      var shouldBisect = (serverUIDs.length > $sync.BISECT_DATE_AT_N_MESSAGES &&
                          curDaysDelta > 1);

      console.log(
        '[syncDateRange]',
        'Should bisect?', shouldBisect ? '***YES, BISECT!***' : 'no.',
        'curDaysDelta =', curDaysDelta,
        'serverUIDs.length =', serverUIDs.length);

      if (shouldBisect) {
        // mark the bisection abort...
        logic(scope, 'syncDateRange_end');
        var bisectInfo = {
          oldStartTS: startTS,
          oldEndTS: endTS,
          numHeaders: serverUIDs.length,
          curDaysDelta: curDaysDelta,
          newStartTS: startTS,
          newEndTS: endTS,
        };
        // If we were being used for a refresh, they may want us to stop
        // and change their sync strategy.
        if (doneCallback('bisect', bisectInfo, null) === 'abort') {
          self.clearErrorHandler();
          doneCallback('bisect-aborted', null);
        } else {
          self.syncDateRange(
            bisectInfo.newStartTS,
            bisectInfo.newEndTS,
            accuracyStamp,
            doneCallback,
            progressCallback);
        }
        return;
      }

      // end bisection special case
      // ----------------------------------------------------------------

      if (progressCallback) {
        progressCallback(0.25);
      }

      // Combine the UIDs from local headers with server UIDs.

      var uidSet = new Set();
      var serverUidSet = new Set();
      var localHeaderMap = {};

      dbHeaders.forEach(function(header) {
        // Ignore not-yet-synced local messages (messages without a
        // srvid), such as messages from a partially-completed local
        // move. Because they have no server ID, we can't compare them
        // to anything currently on the server anyway.
        if (header.srvid !== null) {
          uidSet.add(header.srvid);
          localHeaderMap[header.srvid] = header;
        }
      });

      serverUIDs.forEach(function(uid) {
        uidSet.add(uid);
        serverUidSet.add(uid);
      });

      var imapSyncOptions = {
        connection: self._conn,
        storage: storage,
        newUIDs: [],
        knownUIDs: [],
        knownHeaders: []
      };

      var numDeleted = 0;
      var latch = $allback.latch();

      // Figure out which messages are new, updated, or deleted.
      uidSet.forEach(function(uid) {
        var localHeader = localHeaderMap[uid] || null;
        var hasServer = serverUidSet.has(uid);

        // New
        if (!localHeader && hasServer) {
          imapSyncOptions.newUIDs.push(uid);
          logic(scope, 'new-uid', { uid: uid });
        }
        // Updated
        else if (localHeader && hasServer) {
          imapSyncOptions.knownUIDs.push(uid);
          imapSyncOptions.knownHeaders.push(localHeader);

          if (localHeader.imapMissingInSyncRange) {
            localHeader.imapMissingInSyncRange = null;
            logic(scope, 'found-missing-uid', { uid: uid });
            storage.updateMessageHeader(
              localHeader.date, localHeader.id, true, localHeader,
              /* body hint */ null, latch.defer(), { silent: true });
          }

          logic(scope, 'updated-uid', { uid: uid });
        }
        // Deleted or Ambiguously Deleted
        else if (localHeader && !hasServer) {

          // So, how long has this message been missing for?
          var fuzz = $sync.IMAP_SEARCH_AMBIGUITY_MS;
          var date = localHeader.date;

          // There are 3 possible cases for imapMissingInSyncRange:
          // 1) We don't have one, so just use the current search range.
          // 2) It's disjoint from the current search range, so just use the
          //    current search range.  We do this because we only track one
          //    range for the message, and unioning disjoint ranges erroneously
          //    assumes that we know something about the gap range *when we do
          //    not*.  This situation arises because we previously had synced
          //    backwards in time so that we were on the "old" ambiguous side
          //    of the message.  We now must be on the "new" ambiguous side.
          //    Since our sync range (currently) only ever moves backwards in
          //    time, it is safe for us to discard the information about the
          //    "old" side because we'll get that coverage again soon.
          // 3) It overlaps the current range and we can take their union.
          var missingRange;
          if (!localHeader.imapMissingInSyncRange || // (#1)
              ((localHeader.imapMissingInSyncRange.endTS < startTS) || // (#2)
               (localHeader.imapMissingInSyncRange.startTS > endTS))) {
            // adopt/clobber!
            // (Note that "Infinity" JSON stringifies to null, so be aware when
            // looking at logs involving this code.  But the values are
            // structured cloned for bridge and database purposes and so remain
            // intact.)
            missingRange = localHeader.imapMissingInSyncRange =
              { startTS: startTS || 0, endTS: endTS || Infinity };
          } else { // (#3, union!)
            missingRange = localHeader.imapMissingInSyncRange;
            // Make sure to treat 'null' startTS and endTS correctly.
            // (This is a union range.  We can state that we have not found the
            // message in the time range SINCE missingRange.startTS and BEFORE
            // missingRange.endTS.)
            missingRange.startTS = Math.min(startTS || 0,
                                            missingRange.startTS || 0);
            missingRange.endTS = Math.max(endTS || Infinity,
                                          missingRange.endTS || Infinity);
          }

          // Have we looked all around where the message is supposed
          // to be, and the server never coughed it up? Delete it.
          // (From a range perspective, we want to ensure that the missingRange
          // completely contains the date +/- fuzz range.  We use an inclusive
          // comparison in both cases because we are comparing two ranges, not
          // a single date and a range.)
          if (missingRange.startTS <= date - fuzz &&
              missingRange.endTS >= date + fuzz) {
            logic(scope, 'unambiguously-deleted-uid',
                  { uid: uid, date: date, fuzz: fuzz, missingRange: missingRange });
            storage.deleteMessageHeaderAndBodyUsingHeader(localHeader);
            numDeleted++;
          }
          // Or we haven't looked far enough... maybe it will show up
          // later. We've already marked the updated "missing" range above.
          else {
            logic(scope, 'ambiguously-missing-uid',
                  { uid: uid, missingRange: missingRange,
                    rangeToDelete: { startTS: date - fuzz, endTS: date + fuzz },
                    syncRange: { startTS: startTS, endTS: endTS }});
            storage.updateMessageHeader(
              localHeader.date, localHeader.id, true, localHeader,
              /* body hint */ null, latch.defer(), { silent: true });
          }
        }
      });

      // Now that we've reconciled the difference between the items
      // listen on the server and the items on the client, we can pass
      // the hard download work into $imapsync.Sync.
      latch.then(function() {
        var uidSync = new $imapsync.Sync(imapSyncOptions);
        uidSync.onprogress = progressCallback;
        uidSync.oncomplete = function(newCount, knownCount) {
          logic(scope, 'syncDateRange_end', {
            full: newCount,
            flags: knownCount,
            deleted: numDeleted
          });

          // BrowserBox returns an integer modseq, but it's opaque and
          // we already deal with strings, so cast it here.
          var modseq = (self.box.highestModseq || '') + '';
          storage.markSyncRange(startTS, endTS, modseq, accuracyStamp);

          if (!completed) {
            completed = true;
            self.clearErrorHandler();
            doneCallback(null, null, newCount + knownCount, startTS, endTS);
          }
        };
      });
    }.bind(this));
 },

  /**
   * Downloads all the body representations for a given message.
   *
   *
   *    folder.downloadBodyReps(
   *      header,
   *      {
   *        // maximum number of bytes to fetch total (across all bodyReps)
   *        maximumBytesToFetch: N
   *      }
   *      callback
   *    );
   *
   */
  downloadBodyReps: function() {
    var args = Array.slice(arguments);
    var self = this;

    require(
      [
        './imapchew',
        './protocol/bodyfetcher',
        './protocol/textparser',
        './protocol/snippetparser'
      ],
      function(
        _imapchew,
        _bodyfetcher,
        _textparser,
        _snippetparser
      ) {

        $imapchew =_imapchew;
        $imapbodyfetcher = _bodyfetcher;
        $imaptextparser = _textparser;
        $imapsnippetparser = _snippetparser;

        (self.downloadBodyReps = self._lazyDownloadBodyReps).apply(self, args);
    });
  },

  /**
   * Initiates a request to download all body reps for a single message. If a
   * snippet has not yet been generated this will also generate the snippet...
   */
  _lazyDownloadBodyReps: function(header, options, callback) {
    if (typeof(options) === 'function') {
      callback = options;
      options = null;
    }

    options = options || {};

    var self = this;

    var gotBody = function gotBody(bodyInfo) {
      // target for snippet generation
      var bodyRepIdx = $imapchew.selectSnippetBodyRep(header, bodyInfo);

      // assume user always wants entire email unless option is given...
      var overallMaximumBytes = options.maximumBytesToFetch;

      var bodyParser = $imaptextparser.TextParser;

      // build the list of requests based on downloading required.
      var requests = [];
      var latch = $allback.latch();
      bodyInfo.bodyReps.forEach(function(rep, idx) {
        // attempt to be idempotent by only requesting the bytes we need if we
        // actually need them...
        if (rep.isDownloaded)
          return;

        // default to the entire remaining email. We use the estimate * largish
        // multiplier so even if the size estimate is wrong we should fetch more
        // then the requested number of bytes which if truncated indicates the
        // end of the bodies content.
        var bytesToFetch = Math.min(rep.sizeEstimate * 5, MAX_FETCH_BYTES);

        if (overallMaximumBytes !== undefined) {
          // when we fetch partial results we need to use the snippet parser.
          bodyParser = $imapsnippetparser.SnippetParser;

          // issued enough downloads
          if (overallMaximumBytes <= 0) {
            return;
          }

          // if our estimate is greater then expected number of bytes
          // request the maximum allowed.
          if (rep.sizeEstimate > overallMaximumBytes) {
            bytesToFetch = overallMaximumBytes;
          }

          // subtract the estimated byte size
          overallMaximumBytes -= rep.sizeEstimate;
        }

        // For a byte-serve request, we need to request at least 1 byte, so
        // request some bytes.  This is a logic simplification that should not
        // need to be used because imapchew.js should declare 0-byte files
        // fully downloaded when their parts are created, but better a wasteful
        // network request than breaking here.
        if (bytesToFetch <= 0)
          bytesToFetch = 64;

        // CONDITIONAL LOGIC BARRIER CONDITIONAL LOGIC BARRIER DITTO DITTO
        // Do not do return/continue after this point because we call
        // latch.defer below, and we break if we call it and then throw away
        // that callback without calling it.  (Unsurprisingly.)

        var request = {
          uid: header.srvid,
          partInfo: rep._partInfo,
          bodyRepIndex: idx,
          createSnippet: idx === bodyRepIdx,
          headerUpdatedCallback: latch.defer(header.srvid + '-' + rep._partInfo)
        };

        // we may only need a subset of the total number of bytes.
        if (overallMaximumBytes !== undefined || rep.amountDownloaded) {
          // request the remainder
          request.bytes = [
            rep.amountDownloaded,
            bytesToFetch
          ];
        }

        requests.push(request);
      });

      // we may not have any requests bail early if so.
      if (!requests.length) {
        callback(null, bodyInfo); // no requests === success
        return;
      }

      var fetch = new $imapbodyfetcher.BodyFetcher(
        self._conn,
        bodyParser,
        requests
      );

      self._handleBodyFetcher(fetch, header, bodyInfo, latch.defer('body'));
      latch.then(function(results) {
        callback($allback.extractErrFromCallbackArgs(results), bodyInfo);
      });
    };

    this._storage.getMessageBody(header.suid, header.date, gotBody);
  },

  /**
   * Wrapper around common bodyRep updates...
   */
  _handleBodyFetcher: function(fetcher, header, body, bodyUpdatedCallback) {
    var event = {
      changeDetails: {
        bodyReps: []
      }
    };

    // This will be invoked once per body part that is successfully downloaded
    // or fails to download.
    fetcher.onparsed = function(err, req, resp) {
      if (err) {
        req.headerUpdatedCallback(err);
        return;
      }

      $imapchew.updateMessageWithFetch(header, body, req, resp);

      header.bytesToDownloadForBodyDisplay =
        $imapchew.calculateBytesToDownloadForImapBodyDisplay(body);

      // Always update the header so that we can save
      // bytesToDownloadForBodyDisplay, which will tell the UI whether
      // or not we can show the message body right away.
      this._storage.updateMessageHeader(
        header.date,
        header.id,
        false,
        header,
        body,
        req.headerUpdatedCallback.bind(null, null) // no error
      );

      event.changeDetails.bodyReps.push(req.bodyRepIndex);
    }.bind(this);

    // This will be invoked after all of the onparsed events have fired.
    fetcher.onend = function() {
      // Since we no longer have any updates to make to the body, we want to
      // finally update it now.
      this._storage.updateMessageBody(
        header,
        body,
        {},
        event,
        bodyUpdatedCallback.bind(null, null) // we do not/cannot error
      );
    }.bind(this);
  },

  /**
   * The actual work of downloadBodies, lazily replaces downloadBodies once
   * module deps are loaded.
   */
  _lazyDownloadBodies: function(headers, options, callback) {
    var downloadsNeeded = 0;
    var latch = $allback.latch();
    for (var i = 0; i < headers.length; i++) {
      // We obviously can't do anything with null header references.
      // To avoid redundant work, we also don't want to do any fetching if we
      // already have a snippet.  This could happen because of the extreme
      // potential for a caller to spam multiple requests at us before we
      // service any of them.  (Callers should only have one or two outstanding
      // jobs of this and do their own suppression tracking, but bugs happen.)
      var header = headers[i];
      if (!header || header.snippet !== null) {
        continue;
      }

      // This isn't absolutely guaranteed to be 100% correct, but is good enough
      // for indicating to the caller that we did some work.
      downloadsNeeded++;
      this.downloadBodyReps(headers[i], options, latch.defer(header.suid));
    }
    latch.then(function(results) {
      callback($allback.extractErrFromCallbackArgs(results), downloadsNeeded);
    });
  },

  /**
   * Download snippets or entire bodies for a set of headers.
   */
  downloadBodies: function() {
    var args = Array.slice(arguments);
    var self = this;

    require(
      ['./imapchew', './protocol/bodyfetcher', './protocol/snippetparser'],
      function(
        _imapchew,
        _bodyfetcher,
        _snippetparser
      ) {

        $imapchew =_imapchew;
        $imapbodyfetcher = _bodyfetcher;
        $imapsnippetparser = _snippetparser;

        (self.downloadBodies = self._lazyDownloadBodies).apply(self, args);
    });
  },

  downloadMessageAttachments: function(uid, partInfos, callback, progress) {
    require(['mimeparser'], function(MimeParser) {
      var conn = this._conn;
      var self = this;

      var latch = $allback.latch();
      var anyError = null;
      var bodies = [];

      partInfos.forEach(function(partInfo, index) {
        var partKey = 'body.peek[' + partInfo.part + ']';
        var partDone = latch.defer(partInfo.part);
        conn.listMessages(
          uid,
          [partKey],
          { byUid: true },
          function(err, messages) {
            if (err) {
              anyError = err;
              console.error('attachments:download-error', {
                error: err,
                part: partInfo.part,
                type: partInfo.type
              });
              partDone();
              return;
            }

            // We only receive one message per each listMessages call.
            var msg = messages[0];

            // Find the proper response key of the message. Since this
            // response object is a lightweight wrapper around the
            // response returned from the IRC server and it's possible
            // there are poorly-behaved servers out there, best to err
            // on the side of safety.
            var bodyPart;
            for (var key in msg) {
              if (/body\[/.test(key)) {
                bodyPart = msg[key];
                break;
              }
            }

            if (!bodyPart) {
              console.error('attachments:download-error', {
                error: 'no body part?',
                requestedPart: partKey,
                responseKeys: Object.keys(msg)
              });
              partDone();
              return;
            }

            // TODO: stream attachments, bug 1047032
            var parser = new MimeParser();
            // TODO: escape partInfo.type/encoding
            parser.write('Content-Type: ' + partInfo.type + '\r\n');
            parser.write('Content-Transfer-Encoding: ' + partInfo.encoding + '\r\n');
            parser.write('\r\n');
            parser.write(bodyPart);
            parser.end(); // Parsing is actually synchronous.

            var node = parser.node;

            bodies[index] = new Blob([node.content], {
              type: node.contentType.value
            });

            partDone();
          });
      });

      latch.then(function(results) {
        callback(anyError, bodies);
      });
    }.bind(this));
  },

  shutdown: function() {
  },
};

function ImapFolderSyncer(account, folderStorage) {
  this._account = account;
  this.folderStorage = folderStorage;

  logic.defineScope(this, 'ImapFolderSyncer', {
    accountId: account.id,
    folderId: folderStorage.folderId
  });

  this._syncSlice = null;
  /**
   * The timestamp to use for `markSyncRange` for all syncs in this higher
   * level sync.  Accuracy time-info does not need high precision, so this
   * results in fewer accuracy structures and simplifies our decision logic
   * in `sliceOpenMostRecent`.
   */
  this._curSyncAccuracyStamp = null;
  /**
   * @oneof[
   *   @case[1]{
   *     Growing older/into the past.
   *   }
   *   @case[-1]{
   *     Growing into the present/future.
   *   }
   * ]{
   *   Sync growth direction.  Numeric values chosen to be consistent with
   *   slice semantics (which are oriented like they are because the slices
   *   display messages from newest to oldest).
   * }
   */
  this._curSyncDir = 1;
  /**
   * Synchronization is either 'grow' or 'refresh'.  Growth is when we just
   * want to learn about some new messages.  Refresh is when we know we have
   * already synchronized a time region and want to fully update it and so will
   * keep going until we hit our `syncThroughTS` threshold.
   */
  this._curSyncIsGrow = null;
  /**
   * The timestamp that will anchor the next synchronization.
   */
  this._nextSyncAnchorTS = null;
  /**
   * In the event of a bisection, this is the timestamp to fall back to rather
   * than continuing from our
   */
  this._fallbackOriginTS = null;
  /**
   * The farthest timestamp that we should synchronize through.  The value
   * null is potentially meaningful if we are synchronizing FUTUREWARDS.
   */
  this._syncThroughTS = null;
  /**
   * The number of days we are looking into the past in the current sync step.
   */
  this._curSyncDayStep = null;
  /**
   * If non-null, then we must synchronize all the way through the provided date
   * before we begin increasing _curSyncDayStep.  This helps us avoid
   * oscillation where we make the window too large, shrink it, but then find
   * find nothing.  Since we know that there are going to be a lot of messages
   * before we hit this date, it makes sense to keep taking smaller sync steps.
   */
  this._curSyncDoNotGrowBoundary = null;
  /**
   * The callback to invoke when we complete the sync, regardless of success.
   */
  this._curSyncDoneCallback = null;

  this.folderConn = new ImapFolderConn(account, folderStorage);
}
exports.ImapFolderSyncer = ImapFolderSyncer;
ImapFolderSyncer.prototype = {
  /**
   * Although we do have some errbackoff stuff we do, we can always try to
   * synchronize.  The errbackoff is just a question of when we will retry.
   */
  syncable: true,

  /**
   * Can we grow this sync range?  IMAP always lets us do this.
   */
  get canGrowSync() {
    // Some folders, like localdrafts and outbox, cannot be synced
    // because they are local-only.
    return !this.folderStorage.isLocalOnly;
  },

  /**
   * Perform an initial synchronization of a folder from now into the past,
   * starting with the specified step size.
   */
  initialSync: function(slice, initialDays, syncCallback,
                        doneCallback, progressCallback) {
    syncCallback('sync', false /* Ignore Headers */);
    // We want to enter the folder and get the box info so we can know if we
    // should trigger our SYNC_WHOLE_FOLDER_AT_N_MESSAGES logic.
    // _timelySyncSearch is what will get called next either way, and it will
    // just reuse the connection and will correctly update the deathback so
    // that our deathback is no longer active.
    this.folderConn.withConnection(
      function(folderConn, storage) {
        // Flag to sync the whole range if we
        var syncWholeTimeRange = false;
        if (folderConn && folderConn.box &&
            folderConn.box.exists <
              $sync.SYNC_WHOLE_FOLDER_AT_N_MESSAGES) {
          syncWholeTimeRange = true;
        }

        this._startSync(
          slice, PASTWARDS, // sync into the past
          'grow',
          null, // start syncing from the (unconstrained) future
          $sync.OLDEST_SYNC_DATE, // sync no further back than this constant
          null,
          syncWholeTimeRange ? null : initialDays,
          doneCallback, progressCallback);
      }.bind(this),
      function died() {
        doneCallback('aborted');
      },
      'initialSync', true);
  },

  /**
   * Perform a refresh synchronization covering the requested time range.  This
   * may be converted into multiple smaller synchronizations, but the completion
   * notification will only be generated once the entire time span has been
   * synchronized.
   */
  refreshSync: function(slice, dir, startTS, endTS, origStartTS,
                        doneCallback, progressCallback) {
    // timezone compensation happens in the caller
    this._startSync(
      slice, dir,
      'refresh', // this is a refresh, not a grow!
      dir === PASTWARDS ? endTS : startTS,
      dir === PASTWARDS ? startTS : endTS,
      origStartTS,
      /* syncStepDays */ null, doneCallback, progressCallback);
  },

  /**
   * Synchronize into a time period not currently covered.  Growth has an
   * explicit direction and explicit origin timestamp.
   *
   * @args[
   *   @param[slice]
   *   @param[growthDirection[
   *   @param[anchorTS]
   *   @param[syncStepDays]
   *   @param[doneCallback]
   *   @param[progressCallback]
   * ]
   * @return[Boolean]{
   *   Returns false if no sync is necessary.
   * }
   */
  growSync: function(slice, growthDirection, anchorTS, syncStepDays,
                     doneCallback, progressCallback) {
    var syncThroughTS;
    if (growthDirection === PASTWARDS) {
      syncThroughTS = $sync.OLDEST_SYNC_DATE;
    }
    else { // FUTUREWARDS
      syncThroughTS = null;
    }

    this._startSync(slice, growthDirection, 'grow',
                    anchorTS, syncThroughTS, null, syncStepDays,
                    doneCallback, progressCallback);
  },

  _startSync: function ifs__startSync(slice, dir, syncTypeStr,
                                      originTS, syncThroughTS, fallbackOriginTS,
                                      syncStepDays,
                                      doneCallback, progressCallback) {
    var startTS, endTS;
    this._syncSlice = slice;
    this._curSyncAccuracyStamp = NOW();
    this._curSyncDir = dir;
    this._curSyncIsGrow = (syncTypeStr === 'grow');
    this._fallbackOriginTS = fallbackOriginTS;
    if (dir === PASTWARDS) {
      endTS = originTS;
      if (syncStepDays) {
        if (endTS)
          this._nextSyncAnchorTS = startTS = endTS - syncStepDays * DAY_MILLIS;
        else
          this._nextSyncAnchorTS = startTS = makeDaysAgo(syncStepDays);
      }
      else {
        startTS = syncThroughTS;
        this._nextSyncAnchorTS = null;
      }
    }
    else { // FUTUREWARDS
      startTS = originTS;
      if (syncStepDays) {
        this._nextSyncAnchorTS = endTS = startTS + syncStepDays * DAY_MILLIS;
      }
      else {
        endTS = syncThroughTS;
        this._nextSyncAnchorTS = null;
      }
    }
    this._syncThroughTS = syncThroughTS;
    this._curSyncDayStep = syncStepDays;
    this._curSyncDoNotGrowBoundary = null;
    this._curSyncDoneCallback = doneCallback;

    this.folderConn.syncDateRange(startTS, endTS, this._curSyncAccuracyStamp,
                                  this.onSyncCompleted.bind(this),
                                  progressCallback);
  },

  _doneSync: function ifs__doneSync(err) {
    // The desired number of headers is always a rough request value which is
    // intended to be a new thing for each request.  So we don't want extra
    // desire building up, so we set it to what we have every time.
    //
    this._syncSlice.desiredHeaders = this._syncSlice.headers.length;

    // Save our state even if there was an error because we may have accumulated
    // some partial state.  Additionally, don't *actually* complete until the
    // save has hit the disk.  This is beneficial for both tests and cronsync
    // which has been trying to shut us down in a race with this save
    // triggering.
    this._account.__checkpointSyncCompleted(function () {
      if (this._curSyncDoneCallback)
        this._curSyncDoneCallback(err);

      this._syncSlice = null;
      this._curSyncAccuracyStamp = null;
      this._curSyncDir = null;
      this._nextSyncAnchorTS = null;
      this._syncThroughTS = null;
      this._curSyncDayStep = null;
      this._curSyncDoNotGrowBoundary = null;
      this._curSyncDoneCallback = null;
    }.bind(this));
  },

  /**
   * Whatever synchronization we last triggered has now completed; we should
   * either trigger another sync if we still want more data, or close out the
   * current sync.
   *
   * ## Block Flushing
   *
   * We only cause a call to `ImapAccount.__checkpointSyncCompleted` (via a call
   * to `_doneSync`) to happen and cause dirty blocks to be written to disk when
   * we are done with synchronization.  This is because this method declares
   * victory once a non-trivial amount of work has been done.  In the event that
   * the sync is encountering a lot of deleted messages and so keeps loading
   * blocks, the memory burden is limited because we will be emptying those
   * blocks out so actual memory usage (after GC) is commensurate with the
   * number of (still-)existing messages.  And those are what this method uses
   * to determine when it is done.
   *
   * In the cases where we are synchronizing a ton of messages on a single day,
   * we could perform checkpoints during the process, but realistically any
   * device we are operating on should probably have enough memory to deal with
   * these surges, so we're not doing that yet.
   *
   * @args[
   *   @param[err]
   *   @param[bisectInfo]
   *   @param[messagesSeen Number]
   *   @param[effStartTS DateMS]{
   *     Effective start date in UTC after compensating for server tz offset.
   *   }
   *   @param[effEndTS @oneof[DateMS null]]{
   *     Effective end date in UTC after compensating for server tz offset.
   *     If the end date was open-ended, then null is passed instead.
   *   }
   * ]
   */
  onSyncCompleted: function ifs_onSyncCompleted(err, bisectInfo, messagesSeen,
                                                effStartTS, effEndTS) {
    // In the event the time range had to be bisected, update our info so if
    // we need to take another step we do the right thing.
    if (err === 'bisect') {
      var curDaysDelta = bisectInfo.curDaysDelta,
          numHeaders = bisectInfo.numHeaders;

      // If we had a fallback TS because we were synced to the dawn of time,
      // use that and start by just cutting the range in thirds rather than
      // doing a weighted bisection since the distribution might include
      // a number of messages earlier than our fallback startTS.
      if (this._curSyncDir === FUTUREWARDS && this._fallbackOriginTS) {
        this.folderStorage.clearSyncedToDawnOfTime(this._fallbackOriginTS);
        bisectInfo.oldStartTS = this._fallbackOriginTS;
        this._fallbackOriginTS = null;
        var effOldEndTS = bisectInfo.oldEndTS ||
                          quantizeDate(NOW() + DAY_MILLIS);
        curDaysDelta = Math.round((effOldEndTS - bisectInfo.oldStartTS) /
                                  DAY_MILLIS);
        numHeaders = $sync.BISECT_DATE_AT_N_MESSAGES * 1.5;
      }
      // Sanity check the time delta; if we grew the bounds to the dawn
      // of time, then our interpolation is useless and it's better for
      // us to crank things way down, even if it's erroneously so.
      else if (curDaysDelta > 1000)
        curDaysDelta = 30;

      // - Interpolate better time bounds.
      // Assume a linear distribution of messages, but overestimated by
      // a factor of two so we undershoot.  Also make sure that we subtract off
      // at least 2 days at a time.  This is to ensure that in the case where
      // endTS is null and we end up using makeDaysAgo that we actually shrink
      // by at least 1 day (because of how rounding works for makeDaysAgo).
      var shrinkScale = $sync.BISECT_DATE_AT_N_MESSAGES /
                          (numHeaders * 2),
          dayStep = Math.max(1,
                             Math.min(curDaysDelta - 2,
                                      Math.ceil(shrinkScale * curDaysDelta)));
      this._curSyncDayStep = dayStep;

      if (this._curSyncDir === PASTWARDS) {
        bisectInfo.newEndTS = bisectInfo.oldEndTS;
        this._nextSyncAnchorTS = bisectInfo.newStartTS =
          makeDaysBefore(bisectInfo.newEndTS, dayStep);
        this._curSyncDoNotGrowBoundary = bisectInfo.oldStartTS;
      }
      else { // FUTUREWARDS
        bisectInfo.newStartTS = bisectInfo.oldStartTS;
        this._nextSyncAnchorTS = bisectInfo.newEndTS =
          makeDaysBefore(bisectInfo.newStartTS, -dayStep);
        this._curSyncDoNotGrowBoundary = bisectInfo.oldEndTS;
      }

      // We return now without calling _doneSync because we are not done; the
      // caller (syncDateRange) will re-trigger itself and keep going.
      return;
    }
    else if (err) {
      this._doneSync(err);
      return;
    }

    console.log("Sync Completed!", this._curSyncDayStep, "days",
                messagesSeen, "messages synced");

    // - Slice is dead = we are done
    if (this._syncSlice.isDead) {
      this._doneSync();
      return;
    }

    // If it now appears we know about all the messages in the folder, then we
    // are done syncing and can mark the entire folder as synchronized.  This
    // requires that:
    // - The direction is pastwards. (We check the oldest header, so this
    //   is important.  We don't really need to do a future-wards variant since
    //   we always use pastwards for refreshes and the future-wards variant
    //   really does not need a fast-path since the cost of stepping to 'today'
    //   is much cheaper thana the cost of walking all the way to 1990.)
    // - The number of messages we know about is the same as the number the
    //   server most recently told us are in the folder.
    // - (There are no messages in the folder at all OR)
    // - We have synchronized past the oldest known message header.  (This,
    //   in combination with the fact that we always open from the most recent
    //   set of messages we know about, that we fully synchronize all time
    //   intervals (for now!), and our pastwards-direction for refreshes means
    //   that we can conclude we have synchronized across all messages and
    //   this is a sane conclusion to draw.)
    //
    // NB: If there are any deleted messages, this logic will not save us
    // because we ignored those messages.  This is made less horrible by issuing
    // a time-date that expands as we go further back in time.
    //
    // (I have considered asking to see deleted messages too and ignoring them;
    // that might be suitable.  We could also just be a jerk and force an
    // expunge.)
    var folderMessageCount = this.folderConn && this.folderConn.box &&
                             this.folderConn.box.exists,
        dbCount = this.folderStorage.getKnownMessageCount(),
        syncedThrough =
          ((this._curSyncDir === PASTWARDS) ? effStartTS : effEndTS);
console.log("folder message count", folderMessageCount,
            "dbCount", dbCount,
            "syncedThrough", syncedThrough,
            "oldest known", this.folderStorage.getOldestMessageTimestamp());
    if (this._curSyncDir === PASTWARDS &&
        folderMessageCount === dbCount &&
        (!folderMessageCount ||
         TIME_DIR_AT_OR_BEYOND(this._curSyncDir, syncedThrough,
                               this.folderStorage.getOldestMessageTimestamp()))
       ) {
      // expand the accuracy range to cover everybody
      this.folderStorage.markSyncedToDawnOfTime();
      this._doneSync();
      return;
    }
    // If we've synchronized to the limits of syncing in the given direction,
    // we're done.
    if (!this._nextSyncAnchorTS ||
        TIME_DIR_AT_OR_BEYOND(this._curSyncDir, this._nextSyncAnchorTS,
                              this._syncThroughTS)) {
      this._doneSync();
      return;
    }

    // - Done if this is a grow and we don't want/need any more headers.
    if (this._curSyncIsGrow &&
        this._syncSlice.headers.length >= this._syncSlice.desiredHeaders) {
        // (limited syncs aren't allowed to expand themselves)
      console.log("SYNCDONE Enough headers retrieved.",
                  "have", this._syncSlice.headers.length,
                  "want", this._syncSlice.desiredHeaders,
                  "conn knows about", this.folderConn.box.exists,
                  "sync date", this._curSyncStartTS,
                  "[oldest defined as", $sync.OLDEST_SYNC_DATE, "]");
      this._doneSync();
      return;
    }

    // - Increase our search window size if we aren't finding anything
    // Our goal is that if we are going backwards in time and aren't finding
    // anything, we want to keep expanding our window
    var daysToSearch, lastSyncDaysInPast;
    // If we saw messages, there is no need to increase the window size.  We
    // also should not increase the size if we explicitly shrank the window and
    // left a do-not-expand-until marker.
    if (messagesSeen || (this._curSyncDoNotGrowBoundary !== null &&
         !TIME_DIR_AT_OR_BEYOND(this._curSyncDir, this._nextSyncAnchorTS,
                                this._curSyncDoNotGrowBoundary))) {
      daysToSearch = this._curSyncDayStep;
    }
    else {
      this._curSyncDoNotGrowBoundary = null;
      // This may be a fractional value because of DST
      lastSyncDaysInPast = (quantizeDate(NOW()) -
                           this._nextSyncAnchorTS) / DAY_MILLIS;
      daysToSearch = Math.ceil(this._curSyncDayStep *
                               $sync.TIME_SCALE_FACTOR_ON_NO_MESSAGES);

      // These values used to be more conservative, but the importance of these
      // guards was reduced when we switched to only syncing headers.
      // At current constants (sync=3, scale=2), our doubling in the face of
      // clamping is: 3, 6, 12, 24, 45, ... 90,
      if (lastSyncDaysInPast < 180) {
        if (daysToSearch > 45)
          daysToSearch = 45;
      }
      else if (lastSyncDaysInPast < 365) { // 1 year
        if (daysToSearch > 90)
          daysToSearch = 90;
      }
      else if (lastSyncDaysInPast < 730) { // 2 years
        if (daysToSearch > 120)
          daysToSearch = 120;
      }
      else if (lastSyncDaysInPast < 1825) { // 5 years
        if (daysToSearch > 180)
          daysToSearch = 180;
      }
      else if (lastSyncDaysInPast < 3650) { // 10 years
        if (daysToSearch > 365)
          daysToSearch = 365;
      }
      else if (daysToSearch > 730) {
        daysToSearch = 730;
      }
      this._curSyncDayStep = daysToSearch;
    }

    // - Move the time range back in time more.
    var startTS, endTS;
    if (this._curSyncDir === PASTWARDS) {
      endTS = this._nextSyncAnchorTS;
      this._nextSyncAnchorTS = startTS = makeDaysBefore(endTS, daysToSearch);
    }
    else { // FUTUREWARDS
      startTS = this._nextSyncAnchorTS;
      this._nextSyncAnchorTS = endTS = makeDaysBefore(startTS, -daysToSearch);
      // If this is a bisection that originally had an endTS of null and this
      // is going to be our last step, convert endTS back to a null.
      // (We use the same step check from above for consistency.  We also
      // are trying to do the smallest perturbation to this legacy logic, so
      // we only permute endTS, not _nextSyncAnchorTS although nulling it out
      // should at first glance merely cause us to short-circuit into the
      // _doneSync case before running the check which we know will return
      // true barring the clock jumping backwards.)
      if (this._syncThroughTS === null &&
          TIME_DIR_AT_OR_BEYOND(this._curSyncDir, this._nextSyncAnchorTS,
                                this._syncThroughTS)) {
        endTS = null;
      }
    }
    this.folderConn.syncDateRange(startTS, endTS, this._curSyncAccuracyStamp,
                                  this.onSyncCompleted.bind(this));
  },

  /**
   * Invoked when there are no longer any live slices on the folder and no more
   * active/enqueued mutex ops.
   */
  allConsumersDead: function() {
    this.folderConn.relinquishConn();
  },

  shutdown: function() {
    this.folderConn.shutdown();
  },
};

/**
 * ALL SPECULATIVE RIGHT NOW.
 *
 * Like ImapFolderStorage, but with only one folder and messages named by their
 * X-GM-MSGID value rather than their UID(s).
 *
 * Deletion processing operates slightly differently than for normal IMAP
 * because a message can be removed from one of the folders we synchronize on,
 * but not all of them.  We don't want to be overly deletionary in that case,
 * so we maintain a list of folder id's that are keeping each message alive.
 */
function GmailMessageStorage() {
}
GmailMessageStorage.prototype = {
};

}); // end define
