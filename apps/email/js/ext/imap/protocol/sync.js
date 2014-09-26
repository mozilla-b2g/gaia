define(
  [
    '../imapchew',
    'exports'
  ],
  function(
    $imapchew,
    exports
  ) {

/**
 * Fetch parameters to get the headers / bodystructure; exists to reuse the
 * object since every fetch is the same.
 *
 * We are intentionally not using ENVELOPE because Thunderbird intentionally
 * defaults to to not using ENVELOPE.  Per bienvenu in
 * https://bugzilla.mozilla.org/show_bug.cgi?id=402594#c33 "We stopped using it
 * by default because servers often had issues with it so it was more trouble
 * than it was worth."
 */
var INITIAL_FETCH_PARAMS = [
  'BODYSTRUCTURE',
  'INTERNALDATE',
  'FLAGS',
  'BODY.PEEK[HEADER.FIELDS (FROM TO CC BCC SUBJECT REPLY-TO MESSAGE-ID REFERENCES)]',
];

/**
 * Fetch parameters to just get the flags.
 */
var FLAG_FETCH_PARAMS = ['FLAGS'];

// Number of bytes to fetch for snippet.
var SNIPPET_BYTES = 256;

// See the `ImapFolderConn` block comment for rationale.
var KNOWN_HEADERS_AGGR_COST = 20,
    KNOWN_HEADERS_PER_COST = 1,
    NEW_HEADERS_AGGR_COST = 20,
    NEW_HEADERS_PER_COST = 5,
    NEW_BODIES_PER_COST = 30;

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
 *
 * == Usage
 *
 *    var sync = new ImapUidSync({
 *      initialProgress: 0.25,
 *      connection: (ImapConnection),
 *
 *      storage: (FolderStorage),
 *
 *      knownHeaders: [],
 *
 *      knownUIDs: [],
 *      newUIDs: []
 *    });
 *
 */
function Sync(options) {
  // storage and connections
  this.storage = options.storage;
  this.connection = options.connection;

  this.knownHeaders = options.knownHeaders || [];

  this.knownUIDs = options.knownUIDs || [];
  this.newUIDs = options.newUIDs || [];

  this._progress = options.initialProgress || 0.25;

  this._progressCost =
    (this.knownUIDs.length ? KNOWN_HEADERS_AGGR_COST : 0) +
    KNOWN_HEADERS_PER_COST * this.knownUIDs.length +
    (this.newUIDs.length ? NEW_HEADERS_AGGR_COST : 0) +
    NEW_HEADERS_PER_COST * this.newUIDs.length;

  // events
  this.onprogress = null;
  this.oncomplete = null;

  this._beginSync();
}

Sync.prototype = {
  _updateProgress: function(newProgress) {
    this._progress += newProgress;

    if (this.onprogress) {
      this.onprogress(
        0.25 + 0.75 * (this._progress / this._progressCost)
      );
    }
  },

  _beginSync: function() {
    // pending operations
    var pending = 1;
    var self = this;

    function next() {
      if (!--pending) {
        self.storage.runAfterDeferredCalls(function() {
          if (!self.oncomplete)
            return;

          // Need a timeout here because we batch slices in SliceBridgeProxy and
          // only want to call oncomplete after all those slices have been sent
          // to keep the order the same.
          window.setZeroTimeout(
            function() {
              self.oncomplete(
                self.newUIDs.length,
                self.knownUIDs.length
              );
            }
          );
        });
      }
    }

    if (this.newUIDs.length) {
      pending++;
      this._handleNewUids(next);
    }

    if (this.knownUIDs.length) {
      pending++;
      this._handleKnownUids(next);
    }

    window.setZeroTimeout(next);
  },

  _handleNewUids: function(callback) {
    var pendingSnippets = [];
    var self = this;


   this.connection.listMessages(
      this.newUIDs,
      INITIAL_FETCH_PARAMS,
      { byUid: true },
      function (err, messages) {
        if (err) {
          // XXX the UID might have disappeared already?  we might need to have
          // our initiating command re-do whatever it's up to.  Alternatively,
          // we could drop back from a bulk fetch to a one-by-one fetch.
          console.warn('New UIDs fetch error, ideally harmless:', err);
          callback();
          return;
        }

        messages.forEach(function(msg) {
          // Filter out the \Recent flag; our old imap library didn't
          // pass it along (complaining about it being useless), so we
          // don't either.
          var recentIdx = msg.flags.indexOf('\\Recent');
          if (recentIdx !== -1) {
            msg.flags.splice(recentIdx, 1);
          }

          try {
            // at this point we can build the first batch of header/body
            // information.
            var chewRep = $imapchew.chewHeaderAndBodyStructure(
              msg,
              self.storage.folderId,
              self.storage._issueNewHeaderId()
            );

            chewRep.header.bytesToDownloadForBodyDisplay =
              $imapchew.calculateBytesToDownloadForImapBodyDisplay(
                chewRep.bodyInfo);

            pendingSnippets.push(chewRep);

            // flush our body/header information ? should we do some sorting,
            // etc.. here or just let the UI update ASAP?
            self.storage.addMessageHeader(chewRep.header, chewRep.bodyInfo);
            self.storage.addMessageBody(chewRep.header, chewRep.bodyInfo);
          }
          catch (ex) {
            // it's fine for us to not add bad messages to the database
            // XXX do plumb the logger through here eventually
            console.warn('message problem, skipping message', ex, '\n',
                         ex.stack);
          }
        }.bind(this));

        callback();
      }.bind(this));
  },

  _handleKnownUids: function(callback) {
    var self = this;
    this.connection.listMessages(
      self.knownUIDs,
      FLAG_FETCH_PARAMS,
      { byUid: true },
      function(err, messages) {
        if (err) {
          console.warn('Known UIDs fetch error, ideally harmless:', err);
          callback();
          return;
        }

        messages.forEach(function(msg, i) {
          console.log('FETCHED', i, 'known id', self.knownHeaders[i].id,
                      'known srvid', self.knownHeaders[i].srvid,
                      'actual id', msg.uid);

          // Filter out the \Recent flag; our old imap library didn't
          // pass it along (complaining about it being useless), so we
          // don't either.
          var recentIdx = msg.flags.indexOf('\\Recent');
          if (recentIdx !== -1) {
            msg.flags.splice(recentIdx, 1);
          }

          // RFC 3501 doesn't require that we get results in the order we
          // request them, so use indexOf if things don't line up.  (In fact,
          // dovecot sorts them, so we might just want to sort ours too.)
          if (self.knownHeaders[i].srvid !== msg.uid) {
            i = self.knownUIDs.indexOf(msg.uid);
            // If it's telling us about a message we don't know about, run away.
            if (i === -1) {
              console.warn("Server fetch reports unexpected message:", msg.uid);
              return;
            }
          }
          var header = self.knownHeaders[i];

          // msg.flags is not sorted in browserbox; sort here before comparing.
          var sortedExistingFlags = header.flags.slice();
          sortedExistingFlags.sort();
          msg.flags.sort();

          // Update number of unread messages
          if (header.flags.indexOf('\\Seen') === -1 &&
              msg.flags.indexOf('\\Seen') !== -1) {
            self.storage.folderMeta.unreadCount--;
          } else if (header.flags.indexOf('\\Seen') !== -1 &&
                     msg.flags.indexOf('\\Seen') === -1) {
            self.storage.folderMeta.unreadCount++;
          }

          if (header.flags.toString() !== msg.flags.toString()) {
            console.warn('  FLAGS: "' + header.flags.toString() + '" VS "' +
                         msg.flags.toString() + '"');
            header.flags = msg.flags;
            self.storage.updateMessageHeader(header.date, header.id, true,
                                             header, /* body hint */ null);
          }
          else {
            self.storage.unchangedMessageHeader(header);
          }
        });

        // the fetch results will be bursty, so just update all at once
        self._updateProgress(KNOWN_HEADERS_AGGR_COST +
                             KNOWN_HEADERS_PER_COST * self.knownUIDs.length);

        callback();
      }.bind(this));
  }

};

exports.Sync = Sync;

});
