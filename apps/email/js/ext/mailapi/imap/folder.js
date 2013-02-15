define('mailapi/imap/folder',
  [
    'rdcommon/log',
    'mailparser/mailparser',
    '../a64',
    '../allback',
    '../date',
    '../syncbase',
    '../util',
    './imapchew',
    'module',
    'exports'
  ],
  function(
    $log,
    $mailparser,
    $a64,
    $allback,
    $date,
    $sync,
    $util,
    $imapchew,
    $module,
    exports
  ) {
const allbackMaker = $allback.allbackMaker,
      bsearchForInsert = $util.bsearchForInsert,
      bsearchMaybeExists = $util.bsearchMaybeExists,
      cmpHeaderYoungToOld = $util.cmpHeaderYoungToOld,
      DAY_MILLIS = $date.DAY_MILLIS,
      NOW = $date.NOW,
      FUTURE = $date.FUTURE,
      BEFORE = $date.BEFORE,
      ON_OR_BEFORE = $date.ON_OR_BEFORE,
      SINCE = $date.SINCE,
      makeDaysBefore = $date.makeDaysBefore,
      quantizeDate = $date.quantizeDate;

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
 * We don't care about deleted messages, it's best that we're not aware of them.
 * However, it's important to keep in mind that this means that EXISTS provides
 * us with an upper bound on the messages in the folder since we are blinding
 * ourselves to deleted messages.
 */
const BASELINE_SEARCH_OPTIONS = ['!DELETED'];

/**
 * Fetch parameters to get the headers / bodystructure; exists to reuse the
 * object since every fetch is the same.  Note that imap.js always gives us
 * FLAGS and INTERNALDATE so we don't need to ask for that.
 *
 * We are intentionally not using ENVELOPE because Thunderbird intentionally
 * defaults to to not using ENVELOPE.  Per bienvenu in
 * https://bugzilla.mozilla.org/show_bug.cgi?id=402594#c33 "We stopped using it
 * by default because servers often had issues with it so it was more trouble
 * than it was worth."
 *
 * Of course, imap.js doesn't really support ENVELOPE outside of bodystructure
 * right now either, but that's a lesser issue.  We probably don't want to trust
 * that data, however, if we don't want to trust normal ENVELOPE.
 */
const INITIAL_FETCH_PARAMS = {
  request: {
    headers: ['FROM', 'TO', 'CC', 'BCC', 'SUBJECT', 'REPLY-TO', 'MESSAGE-ID',
              'REFERENCES'],
    struct: true,
    body: false
  },
};

/**
 * Fetch parameters to just get the flags, which is no parameters because
 * imap.js always fetches them right now.
 */
const FLAG_FETCH_PARAMS = {
  request: {
    struct: false,
    headers: false,
    body: false
  },
};

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
function ImapFolderConn(account, storage, _parentLog) {
  this._account = account;
  this._storage = storage;
  this._LOG = LOGFAB.ImapFolderConn(this, _parentLog, storage.folderId);

  this._conn = null;
  this.box = null;
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
    this._account.__folderDemandsConnection(
      this._storage.folderId, label,
      function gotconn(conn) {
        self._conn = conn;
        // Now we have a connection, but it's not in the folder.
        // (If we were doing fancier sync like QRESYNC, we would not enter
        // in such a blase fashion.)
        self._conn.openBox(self._storage.folderMeta.path,
                           function openedBox(err, box) {
            if (err) {
              console.error('Problem entering folder',
                            self._storage.folderMeta.path);
              self._conn = null;
              // hand the connection back, noting a resource problem
              self._account.__folderDoneWithConnection(
                self._conn, false, true);
              if (deathback)
                deathback();
              return;
            }
            self.box = box;
            callback(self, self._storage);
          });
      },
      function deadconn() {
        self._conn = null;
        if (deathback)
          deathback();
      },
      dieOnConnectFailure);
  },

  relinquishConn: function() {
    if (!this._conn)
      return;

    this._account.__folderDoneWithConnection(this._conn, true, false);
    this._conn = null;
  },

  reselectBox: function(callback) {
    this._conn.openBox(this._storage.folderMeta.path, callback);
  },

  /**
   * Perform a SEARCH for the purposes of folder synchronization.  In the event
   * we are unable to reach the server (we are offline, the server is down,
   * nework troubles), the `abortedCallback` will be invoked.  Note that it can
   * take many seconds for us to conclusively fail to reach the server.
   */
  _timelySyncSearch: function(searchOptions, searchedCallback,
                              abortedCallback, progressCallback) {
    // If we don't have a connection, get one, then re-call.
    if (!this._conn) {
      // XXX the abortedCallback should really only be used for the duration
      // of this request, but it will end up being used for the entire duration
      // our folder holds on to the connection.  This is not a great idea as
      // long as we are leaving the IMAP connection idling in the folder (which
      // causes us to not release the connection back to the account).  We
      // should tie this to the mutex or something else transactional.
      this.acquireConn(
        this._timelySyncSearch.bind(this, searchOptions, searchedCallback,
                                    abortedCallback, progressCallback),
        abortedCallback, 'sync', true);
      return;
    }

    // Having a connection is 10% of the battle
    if (progressCallback)
      progressCallback(0.1);
    this._conn.search(searchOptions, function(err, uids) {
        if (err) {
          console.error('Search error on', searchOptions, 'err:', err);
          abortedCallback();
          return;
        }
        searchedCallback(uids);
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
   * @args[
   *   @param[startTS]
   *   @param[endTS]
   *
   * ]
   */
  syncDateRange: function(startTS, endTS, accuracyStamp, useBisectLimit,
                          doneCallback, progressCallback) {
console.log("syncDateRange:", startTS, endTS);
    var searchOptions = BASELINE_SEARCH_OPTIONS.concat(), self = this,
      storage = self._storage;
    if (!useBisectLimit)
      useBisectLimit = $sync.BISECT_DATE_AT_N_MESSAGES;
    if (startTS)
      searchOptions.push(['SINCE', startTS]);
    if (endTS)
      searchOptions.push(['BEFORE', endTS]);

    var callbacks = allbackMaker(
      ['search', 'db'],
      function syncDateRangeLogic(results) {
        var serverUIDs = results.search, headers = results.db,
            knownUIDs = [], uid, numDeleted = 0,
            modseq = self._conn._state.box.highestModSeq || '';

console.log('SERVER UIDS', serverUIDs.length, useBisectLimit);
        if (serverUIDs.length > useBisectLimit) {
          var effEndTS = endTS || FUTURE() ||
                         quantizeDate(Date.now() + DAY_MILLIS),
              curDaysDelta = (effEndTS - startTS) / DAY_MILLIS;
          // We are searching more than one day, we can shrink our search.

console.log('BISECT CASE', serverUIDs.length, 'curDaysDelta', curDaysDelta);
          if (curDaysDelta > 1) {
            // Sanity check the time delta; if we grew the bounds to the dawn
            // of time, then our interpolation is useless and it's better for
            // us to crank things way down, even if it's erroneously so.
            if (curDaysDelta > 1000)
              curDaysDelta = 30;

            // - Interpolate better time bounds.
            // Assume a linear distribution of messages, but overestimated by
            // a factor of two so we undershoot.
            var shrinkScale = $sync.BISECT_DATE_AT_N_MESSAGES /
                                (serverUIDs.length * 2),
                backDays = Math.max(1,
                                    Math.ceil(shrinkScale * curDaysDelta));
            // mark the bisection abort...
            self._LOG.syncDateRange_end(null, null, null, startTS, endTS);
            var bisectInfo = {
              oldStartTS: startTS,
              dayStep: backDays,
              newStartTS: makeDaysBefore(effEndTS, backDays),
            };
            startTS = bisectInfo.newStartTS;
            // If we were being used for a refresh, they may want us to stop
            // and change their sync strategy.
            if (doneCallback('bisect', bisectInfo, null) === 'abort') {
              doneCallback('bisect-aborted', null);
              return null;
            }
console.log("backoff! had", serverUIDs.length, "from", curDaysDelta,
            "startTS", startTS, "endTS", endTS, "backDays", backDays);
            return self.syncDateRange(startTS, endTS, accuracyStamp, null,
                                      doneCallback, progressCallback);
          }
        }

        if (progressCallback)
          progressCallback(0.25);

        // -- infer deletion, flag to distinguish known messages
        // rather than splicing lists and causing shifts, we null out values.
        for (var iMsg = 0; iMsg < headers.length; iMsg++) {
          var header = headers[iMsg];
          var idxUid = serverUIDs.indexOf(header.srvid);
          // deleted!
          if (idxUid === -1) {
            storage.deleteMessageHeaderAndBody(header);
            numDeleted++;
            headers[iMsg] = null;
            continue;
          }
          // null out the UID so the non-null values in the search are the
          // new messages to us.
          serverUIDs[idxUid] = null;
          // but save the UID so we can do a flag-check.
          knownUIDs.push(header.srvid);
        }

        var newUIDs = compactArray(serverUIDs); // (re-labeling, same array)
        if (numDeleted)
          compactArray(headers);

        return self._commonSync(
          newUIDs, knownUIDs, headers,
          function(newCount, knownCount) {
            self._LOG.syncDateRange_end(newCount, knownCount, numDeleted,
                                        startTS, endTS);
            self._storage.markSyncRange(startTS, endTS, modseq,
                                        accuracyStamp);
            if (completed)
              return;
            completed = true;
            doneCallback(null, null, newCount + knownCount);
          },
          progressCallback);
      });

    // - Adjust DB time range for server skew on INTERNALDATE
    // See https://github.com/mozilla-b2g/gaia-email-libs-and-more/issues/12
    // for more in-depth details.  The nutshell is that the server will secretly
    // apply a timezone to the question we ask it and will not actually tell us
    // dates lined up with UTC.  Accordingly, we don't want our DB query to
    // be lined up with UTC but instead the time zone.
    //
    // So if our timezone offset is UTC-4, that means that we will actually be
    // getting results in that timezone, whose midnight is actually 4am UTC.
    // In other words, we care about the time in UTC-0, so we subtract the
    // offset.
    var skewedStartTS = startTS - this._account.tzOffset,
        skewedEndTS = endTS ? endTS - this._account.tzOffset : null,
        completed = false;
    console.log('Skewed DB lookup. Start: ',
                skewedStartTS, new Date(skewedStartTS).toUTCString(),
                'End: ', skewedEndTS,
                skewedEndTS ? new Date(skewedEndTS).toUTCString() : null);
    this._LOG.syncDateRange_begin(null, null, null, startTS, endTS);
    this._timelySyncSearch(
      searchOptions, callbacks.search,
      function abortedSearch() {
        if (completed)
          return;
        completed = true;
        this._LOG.syncDateRange_end(0, 0, 0, startTS, endTS);
        doneCallback('aborted');
      }.bind(this),
      progressCallback);
    this._storage.getAllMessagesInImapDateRange(skewedStartTS, skewedEndTS,
                                                callbacks.db);
  },

  searchDateRange: function(endTS, startTS, searchParams,
                            slice) {
    var searchOptions = BASELINE_SEARCH_OPTIONS.concat(searchParams);
    if (startTS)
      searchOptions.push(['SINCE', startTS]);
    if (endTS)
      searchOptions.push(['BEFORE', endTS]);
  },

  /**
   * Given a list of new-to-us UIDs and known-to-us UIDs and their corresponding
   * headers, synchronize the flags for the known UIDs' headers and fetch and
   * create the header and body objects for the new UIDS.
   *
   * First we fetch the headers/bodystructures for the new UIDs all in one go;
   * all of these headers are going to end up in-memory at the same time, so
   * batching won't let us reduce the overhead right now.  We process them
   * to determine the body parts we should fetch as the results come in.  Once
   * we have them all, we sort them by date, endTS-to-startTS for the third
   * step and start issuing/pipelining the requests.
   *
   * Second, we issue the flag update requests for the known-to-us UIDs.  This
   * is done second so it can help avoid wasting the latency of the round-trip
   * that would otherwise result between steps one and three.  (Although we
   * could also mitigate that by issuing some step three requests even as
   * the step one requests are coming in; our sorting doesn't have to be
   * perfect and may already be reasonably well ordered if UIDs correlate
   * with internal date well.)
   *
   * Third, we fetch the body parts in our newest-to-startTS order, adding
   * finalized headers and bodies as we go.
   */
  _commonSync: function(newUIDs, knownUIDs, knownHeaders, doneCallback,
                        progressCallback) {
    var conn = this._conn, storage = this._storage, self = this;
console.log("_commonSync", 'newUIDs', newUIDs.length, 'knownUIDs',
            knownUIDs.length, 'knownHeaders', knownHeaders.length);
    // See the `ImapFolderConn` block comment for rationale.
    const KNOWN_HEADERS_AGGR_COST = 20,
          KNOWN_HEADERS_PER_COST = 1,
          NEW_HEADERS_AGGR_COST = 20,
          NEW_HEADERS_PER_COST = 5,
          NEW_BODIES_PER_COST = 30;
    var progressCost =
          (knownUIDs.length ? KNOWN_HEADERS_AGGR_COST : 0) +
          KNOWN_HEADERS_PER_COST * knownUIDs.length +
          (newUIDs.length ? NEW_HEADERS_AGGR_COST : 0) +
          NEW_HEADERS_PER_COST * newUIDs.length +
          NEW_BODIES_PER_COST * newUIDs.length,
        progressSoFar = 0;

    function updateProgress(newProgress) {
      progressSoFar += newProgress;
      if (progressCallback)
        progressCallback(0.25 + 0.75 * (progressSoFar / progressCost));
    }

    var callbacks = allbackMaker(
      ['newMsgs', 'knownMsgs'],
      function() {
        // It is possible that async I/O will be required to add a header or a
        // body, so we need to defer declaring the synchronization done until
        // after all of the storage's deferred calls have run because the
        // header/body affecting calls will have been deferred.
        storage.runAfterDeferredCalls(
          doneCallback.bind(null, newUIDs.length, knownUIDs.length));
      });

    // -- Fetch headers/bodystructures for new UIDs
    var newChewReps = [];
    if (newUIDs.length) {
      var newFetcher = this._conn.fetch(newUIDs, INITIAL_FETCH_PARAMS);
      newFetcher.on('message', function onNewMessage(msg) {
          msg.on('end', function onNewMsgEnd() {
console.log('  new fetched, header processing, INTERNALDATE: ', msg.rawDate);
            newChewReps.push($imapchew.chewHeaderAndBodyStructure(msg));
console.log('   header processed');
          });
        });
      newFetcher.on('error', function onNewFetchError(err) {
          // XXX the UID might have disappeared already?  we might need to have
          // our initiating command re-do whatever it's up to.  Alternatively,
          // we could drop back from a bulk fetch to a one-by-one fetch.
          console.warn('New UIDs fetch error, ideally harmless:', err);
        });
      newFetcher.on('end', function onNewFetchEnd() {
          // the fetch results will be bursty, so just update all at once
          updateProgress(NEW_HEADERS_AGGR_COST +
                         NEW_HEADERS_PER_COST * newUIDs.length);

          // sort the messages, endTS to startTS (aka numerically descending)
          newChewReps.sort(function(a, b) {
              return b.msg.date - a.msg.date;
            });

          // - issue the bodypart fetches.
          // Use mailparser's body parsing capabilities, albeit not entirely in
          // the way it was intended to be used since it wants to parse full
          // messages.
          var mparser = new $mailparser.MailParser();
          function setupBodyParser(partDef) {
            mparser._state = 0x2; // body
            mparser._remainder = '';
            mparser._currentNode = null;
            mparser._currentNode = mparser._createMimeNode(null);
            // nb: mparser._multipartTree is an empty list (always)
            mparser._currentNode.meta.contentType =
              partDef.type.toLowerCase() + '/' +
              partDef.subtype.toLowerCase();
            mparser._currentNode.meta.charset =
              partDef.params && partDef.params.charset &&
              partDef.params.charset.toLowerCase();
            mparser._currentNode.meta.transferEncoding =
              partDef.encoding && partDef.encoding.toLowerCase();
            mparser._currentNode.meta.textFormat =
              partDef.params && partDef.params.format &&
              partDef.params.format.toLowerCase();
          }
          function bodyParseBuffer(buffer) {
            process.immediate = true;
            mparser.write(buffer);
            process.immediate = false;
          }
          function finishBodyParsing() {
            process.immediate = true;
            mparser._process(true);
            process.immediate = false;
            // We end up having provided an extra newline that we don't
            // want, so let's cut it off if it exists.
            var content = mparser._currentNode.content;
            if (content.charCodeAt(content.length - 1) === 10)
              content = content.substring(0, content.length - 1);
            return content;
          }

          // XXX imap.js is currently not capable of issuing/parsing multiple
          // literal results from a single fetch result line.  It's not a
          // fundamentally hard problem, but I'd rather defer messing with its
          // parse loop (and internal state tracking) until a future time when
          // I can do some other cleanup at the same time.  (The subsequent
          // literals are just on their own lines with an initial space and then
          // the named literal.  Ex: " BODY[1.2] {2463}".)
          //
          // So let's issue one fetch per body part and then be happy when we've
          // got them all.
          var pendingFetches = 0;
          newChewReps.forEach(function(chewRep, iChewRep) {
            var partsReceived = [];
            // If there are no parts to process, consume it now.
            if (chewRep.bodyParts.length === 0) {
              if ($imapchew.chewBodyParts(chewRep, partsReceived,
                                          storage.folderId,
                                          storage._issueNewHeaderId())) {
                storage.addMessageHeader(chewRep.header);
                storage.addMessageBody(chewRep.header, chewRep.bodyInfo);
              }
            }

            chewRep.bodyParts.forEach(function(bodyPart) {
              var opts = {
                request: {
                  struct: false,
                  headers: false,
                  body: bodyPart.partID
                }
              };
              pendingFetches++;

console.log('  fetching body for', chewRep.msg.id, bodyPart.partID);
              var fetcher;
try {
              fetcher = conn.fetch(chewRep.msg.id, opts);
} catch (ex) {
  console.warn('!failure fetching body', ex);
  return;
}
              setupBodyParser(bodyPart);
              fetcher.on('error', function(err) {
                console.warn('body fetch error', err);
                if (--pendingFetches === 0)
                  callbacks.newMsgs();
              });
              fetcher.on('message', function(msg) {
                setupBodyParser(bodyPart);
                msg.on('data', bodyParseBuffer);
                msg.on('end', function() {
                  updateProgress(NEW_BODIES_PER_COST);
                  partsReceived.push(finishBodyParsing());
console.log('  !fetched body part for', chewRep.msg.id, bodyPart.partID,
            partsReceived.length, chewRep.bodyParts.length);

                  // -- Process
                  if (partsReceived.length === chewRep.bodyParts.length) {
                    try {
                      if ($imapchew.chewBodyParts(
                            chewRep, partsReceived, storage.folderId,
                            storage._issueNewHeaderId())) {
                        storage.addMessageHeader(chewRep.header);
                        storage.addMessageBody(chewRep.header,
                                               chewRep.bodyInfo);
                      }
                      else {
                        self._LOG.bodyChewError(false);
                        console.error('Failed to process body!');
                      }
                    }
                    catch (ex) {
                      self._LOG.bodyChewError(ex);
                      console.error('Failure processing body:', ex, '\n',
                                    ex.stack);
                    }
                  }
                  // If this is the last chew rep, then use its completion
                  // to report our completion.
                  if (--pendingFetches === 0)
                    callbacks.newMsgs();
                });
              });
            });
          });
          if (pendingFetches === 0)
            callbacks.newMsgs();
        });
    }
    else {
      callbacks.newMsgs();
    }

    // -- Fetch updated flags for known UIDs
    if (knownUIDs.length) {
      var knownFetcher = this._conn.fetch(knownUIDs, FLAG_FETCH_PARAMS);
      var numFetched = 0;
      knownFetcher.on('message', function onKnownMessage(msg) {
          // (Since we aren't requesting headers, we should be able to get
          // away without registering this next event handler and just process
          // msg right now, but let's wait on an optimization pass.)
          msg.on('end', function onKnownMsgEnd() {
            var i = numFetched++;
console.log('FETCHED', i, 'known id', knownHeaders[i].id,
            'known srvid', knownHeaders[i].srvid, 'actual id', msg.id);
            // RFC 3501 doesn't require that we get results in the order we
            // request them, so use indexOf if things don't line up.  (In fact,
            // dovecot sorts them, so we might just want to sort ours too.)
            if (knownHeaders[i].srvid !== msg.id) {
              i = knownUIDs.indexOf(msg.id);
              // If it's telling us about a message we don't know about, run away.
              if (i === -1) {
                console.warn("Server fetch reports unexpected message:", msg.id);
                return;
              }
            }
            var header = knownHeaders[i];
            // (msg.flags comes sorted and we maintain that invariant)
            if (header.flags.toString() !== msg.flags.toString()) {
console.warn('  FLAGS: "' + header.flags.toString() + '" VS "' +
             msg.flags.toString() + '"');
              header.flags = msg.flags;
              storage.updateMessageHeader(header.date, header.id, true, header);
            }
            else {
              storage.unchangedMessageHeader(header);
            }
          });
        });
      knownFetcher.on('error', function onKnownFetchError(err) {
          // XXX the UID might have disappeared already?  we might need to have
          // our initiating command re-do whatever it's up to.  Alternatively,
          // we could drop back from a bulk fetch to a one-by-one fetch.
          console.warn('Known UIDs fetch error, ideally harmless:', err);
        });
      knownFetcher.on('end', function() {
        // the fetch results will be bursty, so just update all at once
        updateProgress(KNOWN_HEADERS_AGGR_COST +
                       KNOWN_HEADERS_PER_COST * knownUIDs.length);
        callbacks.knownMsgs();
      });
    }
    else {
      callbacks.knownMsgs();
    }
  },

  downloadMessageAttachments: function(uid, partInfos, callback, progress) {
    var conn = this._conn;
    var mparser = new $mailparser.MailParser();

    // I actually implemented a usable shim for the checksum purposes, but we
    // don't actually care about the checksum, so why bother doing the work?
    var dummyChecksummer = {
      update: function() {},
      digest: function() { return null; },
    };

    function setupBodyParser(partInfo) {
      mparser._state = 0x2; // body
      mparser._remainder = '';
      mparser._currentNode = null;
      mparser._currentNode = mparser._createMimeNode(null);
      mparser._currentNode.attachment = true;
      mparser._currentNode.checksum = dummyChecksummer;
      mparser._currentNode.content = undefined;
      // nb: mparser._multipartTree is an empty list (always)
      mparser._currentNode.meta.contentType = partInfo.type;
      mparser._currentNode.meta.transferEncoding = partInfo.encoding;
      mparser._currentNode.meta.charset = null; //partInfo.charset;
      mparser._currentNode.meta.textFormat = null; //partInfo.textFormat;
    }
    function bodyParseBuffer(buffer) {
      process.immediate = true;
      mparser.write(buffer);
      process.immediate = false;
    }
    function finishBodyParsing() {
      process.immediate = true;
      mparser._process(true);
      process.immediate = false;
      // this is a Buffer!
      return mparser._currentNode.content;
    }

    var anyError = null, pendingFetches = 0, bodies = [];
    partInfos.forEach(function(partInfo) {
      var opts = {
        request: {
          struct: false,
          headers: false,
          body: partInfo.part
        }
      };
      pendingFetches++;
      var fetcher = conn.fetch(uid, opts);

      setupBodyParser(partInfo);
      fetcher.on('error', function(err) {
        if (!anyError)
          anyError = err;
        if (--pendingFetches === 0) {
          try {
            callback(anyError, bodies);
          }
          catch (ex) {
            self._LOG.callbackErr(ex);
          }
        }
      });
      fetcher.on('message', function(msg) {
        setupBodyParser(partInfo);
        msg.on('data', bodyParseBuffer);
        msg.on('end', function() {
          bodies.push(new Blob([finishBodyParsing()], { type: partInfo.type }));

          if (--pendingFetches === 0) {
            try {
              callback(anyError, bodies);
            }
            catch (ex) {
              self._LOG.callbackErr(ex);
            }
          }
        });
      });
    });
  },

  shutdown: function() {
    this._LOG.__die();
  },
};

function ImapFolderSyncer(account, folderStorage, _parentLog) {
  this._account = account;
  this.folderStorage = folderStorage;

  this._LOG = LOGFAB.ImapFolderSyncer(this, _parentLog, folderStorage.folderId);

  /**
   * The timestamp to use for `markSyncRange` for all syncs in this higher
   * level sync.  Accuracy time-info does not need high precision, so this
   * results in fewer accuracy structures and simplifies our decision logic
   * in `sliceOpenFromNow`.
   */
  this._curSyncAccuracyStamp = null;
  /**
   * The start range of the (backward-moving) sync time range.
   */
  this._curSyncStartTS = null;
  /**
   * The number of days we are looking into the past in the current sync step.
   */
  this._curSyncDayStep = null;
  /**
   * If non-null, then we must reach a sync start date of the provided date
   * before we begin increasing _curSyncDayStep.  This helps us avoid
   * oscillation where we make the window too large, shrink it, but then find
   * find nothing.  Since we know that there are going to be a lot of messages
   * before we hit this date, it makes sense to keep taking smaller sync steps.
   */
  this._curSyncDoNotGrowWindowBefore = null;
  /**
   * The callback to invoke when we complete the sync, regardless of success.
   */
  this._curSyncDoneCallback = null;

  this.folderConn = new ImapFolderConn(account, folderStorage, this._LOG);
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
    return true;
  },

  syncDateRange: function(startTS, endTS, syncCallback, doneCallback,
                          progressCallback) {
    syncCallback('sync', false);
    this._startSync(startTS, endTS, doneCallback, progressCallback);
  },

  syncAdjustedDateRange: function(startTS, endTS, syncCallback, doneCallback,
                                  progressCallback) {
    // We need to iterate over the headers to figure out the right
    // date to use.  We can't just use the accuracy range because it may
    // have been bisected by the user scrolling into the past and
    // triggering a refresh.
    this.folderStorage.getMessagesBeforeMessage(
      // Use one less than the fill range because this style of request will
      // start from the 0th element, so we have effectively already traversed
      // 1 message this way.
      null, null, $sync.INITIAL_FILL_SIZE - 1,
      function(headers, moreExpected) {
        if (moreExpected)
          return;

        if (headers.length) {
          var header = headers[headers.length - 1];
          // The timezone issues with internaldate get tricky here.  We know the
          // UTC date of the oldest message here, but that is not necessarily
          // the INTERNALDATE the message will show up on.  So we need to apply
          // the timezone offset to find the day we want our search to cover.
          // (We use UTC dates as our normalized date-without-time
          // representation for talking to the IMAP layer right now.)  The
          // syncDateRange call will also do some timezone compensation, but
          // that is just to make sure it loads the right headers to cover the
          // date we ended up asking it for.
          //
          // We add the timezone offset because we are interested in the date of
          // the message in its own timezone (as opposed to the date in UTC-0).
          startTS = quantizeDate(header.date + this._account.tzOffset);
        }
        syncCallback('sync', true);
        this._startSync(startTS, endTS, doneCallback, progressCallback);
      }.bind(this)
    );
  },

  refreshSync: function(startTS, endTS, useBisectLimit, doneCallback,
                        progressCallback) {
    this._curSyncAccuracyStamp = NOW();
    // timezone compensation happens in the caller
    this.folderConn.syncDateRange(
      startTS, endTS, this._curSyncAccuracyStamp, useBisectLimit,
      doneCallback, progressCallback);
  },

  // Returns false if no sync is necessary.
  growSync: function(endTS, batchHeaders, userRequestsGrowth, syncCallback,
                     doneCallback, progressCallback) {
    // The sync wants to be BEFORE the earliest day (which we are assuming
    // is fully synced based on our day granularity).
    var syncEndTS = quantizeDate(endTS);
    var syncStartTS = null;
    if (batchHeaders.length)
      syncStartTS = batchHeaders[batchHeaders.length - 1].date;

    if (syncStartTS) {
      // We are computing a SINCE value, so adjust the date to be the effective
      // date in the server's timezone and quantize to canonicalize it to be
      // our date (sans time) rep.  (We add the timezone to be relative to that
      // timezone.)
      syncStartTS = quantizeDate(syncStartTS + this._account.tzOffset);
      // If we're not syncing at least one day, flag to give up.
      if (syncStartTS === syncEndTS)
        syncStartTS = null;
    }

    // Perform the sync if there is a range.
    if (syncStartTS) {
      // We intentionally quantized syncEndTS to avoid re-synchronizing messages
      // that got us to our last sync.  So we want to send those excluded
      // headers in a batch since the sync will not report them for us.
      //
      // We need to subtract off our timezone offset since we are trying to
      // imitate the database logic here, and this compensation happens using
      // timestamps in UTC-0.  Also note we are doing this to the end-stamp, not
      // the start stamp, so there is no interaction with the above.
      var iFirstNotToSend = 0,
          localSyncEndTS = syncEndTS - this._account.tzOffset;
      for (; iFirstNotToSend < batchHeaders.length; iFirstNotToSend++) {
        if (BEFORE(batchHeaders[iFirstNotToSend].date, localSyncEndTS))
          break;
      }

      // Perform a limited synchronization; do not issue additional syncs!
      syncCallback('limsync', iFirstNotToSend);
      // Because we are refreshing a known time interval and growth is not
      // particularly likely, we really do not want bisection to happen, so
      // pass a super-high limit for the bisection cap.
      this._startSync(syncStartTS, syncEndTS, doneCallback, progressCallback,
                      $sync.TOO_MANY_MESSAGES);
      return true;
    }
    // If growth was requested/is allowed or our accuracy range already covers
    // as far back as we go, issue a (potentially expanding) sync.
    else if (batchHeaders.length === 0 && userRequestsGrowth) {
      syncCallback('sync', 0);
      this._startSync(null, syncEndTS, doneCallback, progressCallback);
      return true;
    }

    return false;
  },

  _startSync: function ifs__startSync(startTS, endTS, doneCallback,
                                      progressCallback, useBisectLimit) {
    if (startTS === null)
      startTS = endTS - ($sync.INITIAL_SYNC_DAYS * DAY_MILLIS);
    this._curSyncAccuracyStamp = NOW();
    this._curSyncStartTS = startTS;
    this._curSyncDayStep = $sync.INITIAL_SYNC_DAYS;
    this._curSyncDoNotGrowWindowBefore = null;
    this._curSyncDoneCallback = doneCallback;

    this.folderConn.syncDateRange(startTS, endTS, this._curSyncAccuracyStamp,
                                  useBisectLimit,
                                  this.onSyncCompleted.bind(this),
                                  progressCallback);
  },

  _doneSync: function ifs__doneSync(err) {
    if (this._curSyncDoneCallback)
      this._curSyncDoneCallback(err);

    // Save our state even if there was an error because we may have accumulated
    // some partial state.
    this._account.__checkpointSyncCompleted();

    this._curSyncAccuracyStamp = null;
    this._curSyncStartTS = null;
    this._curSyncDayStep = null;
    this._curSyncDoNotGrowWindowBefore = null;
    this._curSyncDoneCallback = null;
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
   */
  onSyncCompleted: function ifs_onSyncCompleted(err, bisectInfo, messagesSeen) {
    // In the event the time range had to be bisected, update our info so if
    // we need to take another step we do the right thing.
    if (err === 'bisect') {
      this._curSyncDoNotGrowWindowBefore = bisectInfo.oldStartTS;
      this._curSyncDayStep = bisectInfo.dayStep;
      this._curSyncStartTS = bisectInfo.newStartTS;
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

    // If it now appears we know about all the messages in the folder, then we
    // are done syncing and can mark the entire folder as synchronized.  This
    // requires that the number of messages we know about is the same as the
    // number the server most recently told us are in the folder, plus that the
    // slice's oldest know message is the oldest message known to the db,
    // implying that we have fully synchronized the folder during this session.
    //
    // NB: If there are any deleted messages, this logic will not save us
    // because we ignored those messages.  This is made less horrible by issuing
    // a time-date that expands as we go further back in time.
    //
    // (I have considered asking to see deleted messages too and ignoring them;
    // that might be suitable.  We could also just be a jerk and force an
    // expunge.)
    var folderMessageCount = this.folderConn && this.folderConn.box &&
                             this.folderConn.box.messages.total,
        dbCount = this.folderStorage.getKnownMessageCount();
console.log("folder message count", folderMessageCount,
            "dbCount", dbCount,
            "oldest known", this.folderStorage.headerIsOldestKnown(
              this.folderStorage._curSyncSlice.startTS,
              this.folderStorage._curSyncSlice.startUID));
    if (folderMessageCount === dbCount &&
        this.folderStorage.headerIsOldestKnown(
          this.folderStorage._curSyncSlice.startTS,
          this.folderStorage._curSyncSlice.startUID)) {
      // (do not desire more headers)
      this.folderStorage._curSyncSlice.desiredHeaders =
        this.folderStorage._curSyncSlice.headers.length;
      // expand the accuracy range to cover everybody
      this.folderStorage.markSyncedEntireFolder();
    }
    // If our slice has now gone to the dawn of time, we can decide we have
    // enough headers.
    else if (this._curSyncStartTS &&
             ON_OR_BEFORE(this._curSyncStartTS,
                          $sync.OLDEST_SYNC_DATE)) {
      this.folderStorage._curSyncSlice.desiredHeaders =
        this.folderStorage._curSyncSlice.headers.length;
    }

    // - Done if we don't want any more headers.
    if (this.folderStorage._curSyncSlice.headers.length >=
          this.folderStorage._curSyncSlice.desiredHeaders ||
        // (limited syncs aren't allowed to expand themselves)
        (this.folderStorage._curSyncSlice.waitingOnData === 'limsync')) {
      console.log("SYNCDONE Enough headers retrieved.",
                  "have", this.folderStorage._curSyncSlice.headers.length,
                  "want", this.folderStorage._curSyncSlice.desiredHeaders,
                  "conn knows about", this.folderConn.box.messages.total,
                  "sync date", this._curSyncStartTS,
                  "[oldest defined as", $sync.OLDEST_SYNC_DATE, "]");
      // If we are accumulating, we don't want to adjust our count upwards;
      // the release will slice the excess off for us.
      if (!this.folderStorage._curSyncSlice._accumulating) {
        this.folderStorage._curSyncSlice.desiredHeaders =
          this.folderStorage._curSyncSlice.headers.length;
      }
      this._doneSync();
      return;
    }
    else if (this.folderStorage._curSyncSlice._accumulating) {
      this.folderStorage._curSyncSlice.setStatus(
        'synchronizing', true, true, true);
    }

    // - Increase our search window size if we aren't finding anything
    // Our goal is that if we are going backwards in time and aren't finding
    // anything, we want to keep expanding our window
    var daysToSearch, lastSyncDaysInPast;
    // If we saw messages, there is no need to increase the window size.  We
    // also should not increase the size if we explicitly shrank the window and
    // left a do-not-expand-until marker.
    if (messagesSeen || (this._curSyncDoNotGrowWindowBefore !== null &&
         SINCE(this._curSyncStartTS, this._curSyncDoNotGrowWindowBefore))) {
      daysToSearch = this._curSyncDayStep;
    }
    else {
      // This may be a fractional value because of DST
      lastSyncDaysInPast = ((quantizeDate(NOW())) - this._curSyncStartTS) /
                           DAY_MILLIS;
      daysToSearch = Math.ceil(this._curSyncDayStep *
                               $sync.TIME_SCALE_FACTOR_ON_NO_MESSAGES);

      if (lastSyncDaysInPast < 180) {
        if (daysToSearch > 14)
          daysToSearch = 14;
      }
      else if (lastSyncDaysInPast < 365) {
        if (daysToSearch > 30)
          daysToSearch = 30;
      }
      else if (lastSyncDaysInPast < 730) {
        if (daysToSearch > 60)
          daysToSearch = 60;
      }
      else if (lastSyncDaysInPast < 1095) {
        if (daysToSearch > 90)
          daysToSearch = 90;
      }
      else if (lastSyncDaysInPast < 1825) { // 5 years
        if (daysToSearch > 120)
          daysToSearch = 120;
      }
      else if (lastSyncDaysInPast < 3650) {
        if (daysToSearch > 365)
          daysToSearch = 365;
      }
      else if (daysToSearch > 730) {
        daysToSearch = 730;
      }
      this._curSyncDayStep = daysToSearch;
    }

    // - Move the time range back in time more.
    var startTS = makeDaysBefore(this._curSyncStartTS, daysToSearch),
        endTS = this._curSyncStartTS;
    this._curSyncStartTS = startTS;
    this.folderConn.syncDateRange(startTS, endTS, this._curSyncAccuracyStamp,
                                  null, this.onSyncCompleted.bind(this));
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
    this._LOG.__die();
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

var LOGFAB = exports.LOGFAB = $log.register($module, {
  ImapFolderConn: {
    type: $log.CONNECTION,
    subtype: $log.CLIENT,
    events: {
    },
    TEST_ONLY_events: {
    },
    errors: {
      callbackErr: { ex: $log.EXCEPTION },

      bodyChewError: { ex: $log.EXCEPTION },
    },
    asyncJobs: {
      syncDateRange: {
        newMessages: true, existingMessages: true, deletedMessages: true,
        start: false, end: false,
      },
    },
  },
  ImapFolderSyncer: {
    type: $log.DATABASE,
    events: {
    }
  },
}); // end LOGFAB

}); // end define
