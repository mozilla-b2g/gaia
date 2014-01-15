
define('mailapi/imap/protocol/sync',
  [
    'mailparser/mailparser',
    '../imapchew',
    'exports'
  ],
  function(
    $mailparser,
    $imapchew,
    exports
  ) {

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
var INITIAL_FETCH_PARAMS = {
  request: {
    headers: ['FROM', 'TO', 'CC', 'BCC', 'SUBJECT', 'REPLY-TO', 'MESSAGE-ID',
              'REFERENCES'],
    struct: true,
    body: false
  }
};

/**
 * Fetch parameters to just get the flags, which is no parameters because
 * imap.js always fetches them right now.
 */
var FLAG_FETCH_PARAMS = {
  request: {
    struct: false,
    headers: false,
    body: false
  }
};


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
    var newFetcher = this.connection.fetch(
      this.newUIDs, INITIAL_FETCH_PARAMS
    );

    var pendingSnippets = [];
    var self = this;

    newFetcher.on('message', function onNewMessage(msg) {
      msg.on('end', function onNewMsgEnd() {
  console.log('  new fetched, header processing, INTERNALDATE: ', msg.rawDate);

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
            self.storage.addMessageHeader(chewRep.header);
            self.storage.addMessageBody(chewRep.header, chewRep.bodyInfo);
          }
          catch (ex) {
            // it's fine for us to not add bad messages to the database
            // XXX do plumb the logger through here eventually
            console.warn('message problem, skipping message', ex, '\n',
                         ex.stack);
          }
      });
    });

    newFetcher.on('error', function onNewFetchError(err) {
      // XXX the UID might have disappeared already?  we might need to have
      // our initiating command re-do whatever it's up to.  Alternatively,
      // we could drop back from a bulk fetch to a one-by-one fetch.
      console.warn('New UIDs fetch error, ideally harmless:', err);
    });

    newFetcher.on('end', callback);
  },

  _handleKnownUids: function(callback) {
    var self = this;
    var knownFetcher = this.connection.fetch(
      self.knownUIDs, FLAG_FETCH_PARAMS
    );

    var numFetched = 0;
    knownFetcher.on('message', function onKnownMessage(msg) {
      // (Since we aren't requesting headers, we should be able to get
      // away without registering this next event handler and just process
      // msg right now, but let's wait on an optimization pass.)
      msg.on('end', function onKnownMsgEnd() {
        var i = numFetched++;

console.log('FETCHED', i, 'known id', self.knownHeaders[i].id,

        'known srvid', self.knownHeaders[i].srvid, 'actual id', msg.id);
        // RFC 3501 doesn't require that we get results in the order we
        // request them, so use indexOf if things don't line up.  (In fact,
        // dovecot sorts them, so we might just want to sort ours too.)
        if (self.knownHeaders[i].srvid !== msg.id) {
          i = self.knownUIDs.indexOf(msg.id);
          // If it's telling us about a message we don't know about, run away.
          if (i === -1) {
            console.warn("Server fetch reports unexpected message:", msg.id);
            return;
          }
        }
        var header = self.knownHeaders[i];
        // (msg.flags comes sorted and we maintain that invariant)
        if (header.flags.toString() !== msg.flags.toString()) {

console.warn('  FLAGS: "' + header.flags.toString() + '" VS "' +

         msg.flags.toString() + '"');
          header.flags = msg.flags;
          self.storage.updateMessageHeader(header.date, header.id, true, header);
        }
        else {
          self.storage.unchangedMessageHeader(header);
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
      self._updateProgress(KNOWN_HEADERS_AGGR_COST +
                           KNOWN_HEADERS_PER_COST * self.knownUIDs.length);

      callback();
    });
  }

};

exports.Sync = Sync;

});

define('mailapi/imap/protocol/bodyfetcher',
  [
    'exports'
  ],
  function(
   exports
  ) {

function fetchOptions(partInfo, partial) {
  var body;

  if (!partial) {
    body = partInfo.partID;
  } else {
    // for some reason the imap lib uses strings to delimit the starting and
    // ending byte range....
    body = [
      partInfo.partID,
      String(partial[0]) + '-' + String(partial[1])
    ];
  }

  return {
    request: {
      struct: false,
      headers: false,
      body: body
    }
  };
}

/**
 * Convenience class and wrapper around building multiple fetching operations or
 * the aggregation of many fetching operations into a single unit of
 * operation...
 *
 *
 *    var fetcher = new $bodyfetcher.BodyFetcher(
 *      connection,
 *      BodyParser (or any other kind of parser),
 *      [
 *        { uid: X, partInfo: {}, bytes: [A, B] }
 *      ]
 *    );
 *
 *    // in all examples item is a single element in the
 *    // array (third argument).
 *
 *    fetcher.onerror = function(err, item) {};
 *    fetcher.ondata = function(parsed, item) {}
 *    fetcher.onend = function() {}
 *
 */
function BodyFetcher(connection, parserClass, list) {
  this.connection = connection;
  this.parserClass = parserClass;
  this.list = list;

  this.pending = list.length;

  this.onerror = null;
  this.ondata = null;
  this.onend = null;

  list.forEach(this._fetch, this);
}

BodyFetcher.prototype = {
  _fetch: function(request) {
    // build the fetcher based on the request.uid
    var fetch = this.connection.fetch(
      request.uid,
      fetchOptions(request.partInfo, request.bytes)
    );

    var parser = new this.parserClass(request.partInfo);
    var self = this;

    fetch.on('error', function(err) {
      // if fetch provides an error we expect this request to be completed so we
      // resolve here...
      self._resolve(err, request);
    });

    fetch.on('message', function(msg) {
      msg.on('error', function(err) {
        // similar to the fetch error we expect this only to be called once and
        // exclusive of the error event on the fetch itself...
        self._resolve(err, request);
      });

      msg.on('data', function(content) {
        parser.parse(content);
      });

      msg.on('end', function() {
        self._resolve(null, request, parser.complete(msg));
      });
    });
  },

  _resolve: function() {
    var args = Array.slice(arguments);
    var err = args[0];

    if (err) {
      if (this.onerror) {
        this.onerror.apply(this, args);
      }
    } else {
      if (this.onparsed) {
        // get rid of the error object
        args.shift();

        this.onparsed.apply(this, args);
      }
    }

    if (!--this.pending && this.onend) {
      this.onend();
    }
  }
};


exports.BodyFetcher = BodyFetcher;

});

define('mailapi/imap/protocol/textparser',
  [
    'mailparser/mailparser',
    'exports'
  ],
  function(
   $mailparser,
   exports
  ) {


/**
 * Simple wrapper around mailparser hacks allows us to reuse data from the
 * BODYSTRUCT request that contained the mime type, etc....
 *
 *    var parser = $textparser.TextParser(
 *      bodyInfo.bodyReps[n]
 *    );
 *
 *    // msg is some stream thing from fetcher
 *
 *    msg.on('data', parser.parse.bind(parser));
 *    msg.on('end', function() {
 *      var content = parser.complete();
 *    });
 *
 */
function TextParser(partDef) {
  var mparser = this._mparser = new $mailparser.MailParser();

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

  if (partDef.pendingBuffer) {
    this.parse(partDef.pendingBuffer);
  }
}

TextParser.prototype = {
  parse: function(buffer) {
    process.immediate = true;
    this._mparser.write(buffer);
    process.immediate = false;
  },

  complete: function(msg) {
    process.immediate = true;
    this._mparser._process(true);
    process.immediate = false;
    // We end up having provided an extra newline that we don't want, so let's
    // cut it off if it exists.
    var content = this._mparser._currentNode.content;
    if (content.charCodeAt(content.length - 1) === 10)
      content = content.substring(0, content.length - 1);

    return {
      bytesFetched: msg.size,
      text: content
    };
  }
};

exports.TextParser = TextParser;

});

define('mailapi/imap/protocol/snippetparser',
  [
    './textparser',
    'exports'
  ],
  function(
   $textparser,
   exports
  ) {

var TextParser = $textparser.TextParser;

function bufferAppend(buf1, buf2) {
  var newBuf = new Buffer(buf1.length + buf2.length);
  buf1.copy(newBuf, 0, 0);
  if (Buffer.isBuffer(buf2))
    buf2.copy(newBuf, buf1.length, 0);
  else if (Array.isArray(buf2)) {
    for (var i=buf1.length, len=buf2.length; i<len; i++)
      newBuf[i] = buf2[i];
  }

  return newBuf;
};

/**
 * Wrapper around the textparser, accumulates buffer content and returns it as
 * part of the .complete step.
 */
function SnippetParser(partDef) {
  $textparser.TextParser.apply(this, arguments);
}

SnippetParser.prototype = {
  parse: function(buffer) {
    if (!this._buffer) {
      this._buffer = buffer;
    } else {
      this._buffer = bufferAppend(this._buffer, buffer);
    }

    // do some magic parsing
    TextParser.prototype.parse.apply(this, arguments);
  },

  complete: function() {
    var content =
      TextParser.prototype.complete.apply(this, arguments);

    content.buffer = this._buffer;
    return content;
  }
};

exports.SnippetParser = SnippetParser;

});
