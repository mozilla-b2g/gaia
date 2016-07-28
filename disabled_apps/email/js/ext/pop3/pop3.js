define(['module', 'exports', 'logic', 'tcp-socket', 'md5',
        './transport', 'mimeparser', 'imap/imapchew',
        'syncbase', 'date',
        'mimefuncs',
        './mime_mapper', 'allback'],
function(module, exports, logic, tcpSocket, md5,
         transport, MimeParser, imapchew,
         syncbase, dateMod, mimefuncs, mimeMapper, allback) {

  /**
   * The Pop3Client modules and classes are organized according to
   * their function, as follows, from low-level to high-level:
   *
   *      [Pop3Parser] parses raw protocol data from the server.
   *      [Pop3Protocol] handles the request/response semantics
   *                     along with the Request and Response classes,
   *                     which are mostly for internal use. Pop3Protocol
   *                     does not deal with I/O at all.
   *      [Pop3Client] hooks together the Protocol and a socket, and
   *                   handles high-level details like listing messages.
   *
   * In general, this tries to share as much code as possible with
   * IMAP/ActiveSync. We reuse imapchew.js to normalize POP3 MIME
   * messages in the same way as IMAP, to avoid spurious errors trying
   * to write yet another translation layer. All of the MIME parsing
   * happens in this file; transport.js contains purely wire-level
   * logic.
   *
   * Each Pop3Client is responsible for one connection only;
   * Pop3Account in GELAM is responsible for managing connection lifetime.
   *
   * As of this writing (Nov 2013), there was only one other
   * reasonably complete POP3 JavaScript implementation, available at
   * <https://github.com/ditesh/node-poplib>. It would have probably
   * worked, but since the protocol is simple, it seemed like a better
   * idea to avoid patching over Node-isms more than necessary (e.g.
   * avoiding Buffers, node socket-isms, etc.). Additionally, that
   * library only contained protocol-level details, so we would have
   * only really saved some code in transport.js.
   *
   * For error conditions, this class always normalizes errors into
   * the format as documented in the constructor below.
   * All external callbacks get passed node-style (err, ...).
   */

  // Allow setTimeout and clearTimeout to be shimmed for unit tests.
  var setTimeout = window.setTimeout.bind(window);
  var clearTimeout = window.clearTimeout.bind(window);
  exports.setTimeoutFunctions = function(set, clear) {
    setTimeout = set;
    clearTimeout = clear;
  }

  /***************************************************************************
   * Pop3Client
   *
   * Connect to a POP3 server. `cb` is always invoked, with (err) if
   * the connction attempt failed. Options are as follows:
   *
   * @param {string} host
   * @param {string} username
   * @param {string} password
   * @param {string} port
   * @param {boolean|'plain'|'ssl'|'starttls'} crypto
   * @param {int} connTimeout optional connection timeout
   * @param {'apop'|'sasl'|'user-pass'} preferredAuthMethod first method to try
   * @param {boolean} debug True to dump the protocol to the console.
   *
   * The connection's current state is available at `.state`, with the
   * following values:
   *
   *   'disconnected', 'greeting', 'starttls', 'authorization', 'ready'
   *
   * All callback errors are normalized to the following form:
   *
   *    var err = {
   *      scope: 'connection|authentication|mailbox|message',
   *      name: '...',
   *      message: '...',
   *      request: Pop3Client.Request (if applicable),
   *      exception: (A socket error, if available),
   *    };
   *
   */
  var Pop3Client = exports.Pop3Client = function(options, cb) {
    // for clarity, list the available options:
    this.options = options = options || {};
    options.host = options.host || null;
    options.username = options.username || null;
    options.password = options.password || null;
    options.port = options.port || null;
    options.crypto = options.crypto || false;
    options.connTimeout = options.connTimeout || 30000;
    options.debug = options.debug || false;
    options.authMethods = ['apop', 'sasl', 'user-pass'];

    logic.defineScope(this, 'Pop3Client');

    if (options.preferredAuthMethod) {
      // if we prefer a certain auth method, try that first.
      var idx = options.authMethods.indexOf(options.preferredAuthMethod);
      if (idx !== -1) {
        options.authMethods.splice(idx, 1);
      }
      options.authMethods.unshift(options.preferredAuthMethod);
    }

    // Normalize the crypto option:
    if (options.crypto === true) {
      options.crypto = 'ssl';
    } else if (!options.crypto) {
      options.crypto = 'plain';
    }

    if (!options.port) {
      options.port = {
        'plain': 110,
        'starttls': 110,
        'ssl': 995
      }[options.crypto];
      if (!options.port) {
        throw new Error('Invalid crypto option for Pop3Client: ' +
                        options.crypto);
      }
    }

    // The public state of the connection (the only one we really care
    // about is 'disconnected')
    this.state = 'disconnected';
    this.authMethod = null; // Upon successful login, the method that worked.

    // Keep track of the message IDs and UIDLs the server has reported
    // during this session (these values could change in each
    // session, though they probably won't):
    this.idToUidl = {};
    this.uidlToId = {};
    this.idToSize = {};
    // An array of {uidl: "", size: 0, number: } for each message
    // retrieved as a result of calling LIST
    this._messageList = null;
    this._greetingLine = null; // contains APOP auth info, if available

    this.protocol = new transport.Pop3Protocol();
    this.socket = tcpSocket.open(options.host, options.port, {
      useSecureTransport: (options.crypto === 'ssl' ||
                           options.crypto === true)
    });

    var connectTimeout = setTimeout(function() {
      this.state = 'disconnected';
      if (connectTimeout) {
        clearTimeout(connectTimeout);
        connectTimeout = null;
      }
      cb && cb({
        scope: 'connection',
        request: null,
        name: 'unresponsive-server',
        message: 'Could not connect to ' + options.host + ':' + options.port +
          ' with ' + options.crypto + ' encryption.',
      });
    }.bind(this), options.connTimeout);

    // Hook the protocol and socket together:
    this.socket.ondata = this.protocol.onreceive.bind(this.protocol);
    this.protocol.onsend = this.socket.send.bind(this.socket);

    this.socket.onopen = function() {
      console.log('pop3:onopen');
      if (connectTimeout) {
        clearTimeout(connectTimeout);
        connectTimeout = null;
      }
      this.state = 'greeting';
      // No further processing is needed here. We wait for the server
      // to send a +OK greeting before we try to authenticate.
    }.bind(this);

    this.socket.onerror = function(evt) {
      var err = evt && evt.data || evt;
      console.log('pop3:onerror', err);
      if (connectTimeout) {
        clearTimeout(connectTimeout);
        connectTimeout = null;
      }
      cb && cb({
        scope: 'connection',
        request: null,
        name: 'unresponsive-server',
        message: 'Socket exception: ' + JSON.stringify(err),
        exception: err,
      });
    }.bind(this);

    // sync cares about listening for us closing; it has no way to be informed
    // by disaster recovery otherwise
    this.onclose = null;
    this.socket.onclose = function() {
      console.log('pop3:onclose');
      this.protocol.onclose();
      this.close();
      if (this.onclose) {
        this.onclose();
      }
    }.bind(this);

    // To track requests/responses in the presence of a server
    // greeting, store an empty request here. Our request/response
    // matching logic will pair the server's greeting with this
    // request.
    this.protocol.pendingRequests.push(
    new transport.Request(null, [], false, function(err, rsp) {
      if (err) {
        cb && cb({
          scope: 'connection',
          request: null,
          name: 'unresponsive-server',
          message: err.getStatusLine(),
          response: err,
        });
        return;
      }

      // Store the greeting line, it might be needed in authentication
      this._greetingLine = rsp.getLineAsString(0);

      this._maybeUpgradeConnection(function(err) {
        if (err) { cb && cb(err); return; }
        this._thenAuthorize(function(err) {
          if (!err) {
            this.state = 'ready';
          }
          cb && cb(err);
        });
      }.bind(this));
    }.bind(this)));
  }

  /**
   * Disconnect from the server forcibly. Do not issue a QUIT command.
   */
  Pop3Client.prototype.close =
  Pop3Client.prototype.die = function() {
    if (this.state !== 'disconnected') {
      this.state = 'disconnected';
      this.socket.close();
      // No need to do anything further; we'll tear down when we
      // receive the socket's "close" event.
    }
  }

  /**
   * Fetch the capabilities from the server. If the connection
   * supports STLS and we've specified 'starttls' as the crypto
   * option, we upgrade the connection here.
   */
  // XXX: UNUSED FOR NOW. Maybe we'll use it later.
  Pop3Client.prototype._getCapabilities = function(cb) {
    this.protocol.sendRequest('CAPA', [], true, function(err, rsp) {
      if (err) {
        // It's unlikely this server's going to do much, but we'll try.
        this.capabilities = {};
      } else {
        var lines = rsp.getDataLines();
        for (var i = 0; i < lines.length; i++) {
          var words = lines[i].split(' ');
          this.capabilities[words[0]] = words.slice(1);
        }
      }
    }.bind(this));
  }

  /**
   * If we're trying to use TLS, upgrade now.
   *
   * This is followed by ._thenAuthorize().
   */
  Pop3Client.prototype._maybeUpgradeConnection = function(cb) {
    if (this.options.crypto === 'starttls') {
      this.state = 'starttls';
      this.protocol.sendRequest('STLS', [], false, function(err, rsp) {
        if (err) {
          cb && cb({
            scope: 'connection',
            request: err.request,
            name: 'bad-security',
            message: err.getStatusLine(),
            response: err,
          });
          return;
        }
        this.socket.upgradeToSecure();
        cb();
      }.bind(this));
    } else {
      cb();
    }
  }

  /**
   * Set the current state to 'authorization' and attempts to
   * authenticate the user with any available authentication method.
   * We try APOP first if the server supports it, since we can avoid
   * replay attacks and authenticate in one roundtrip. Otherwise, we
   * try SASL AUTH PLAIN, which POP3 servers are (in theory) required
   * to support if they support SASL at all. Lastly, we fall back to
   * plain-old USER/PASS authentication if that's all we have left.
   *
   * Presently, if one authentication method fails for any reason, we
   * simply try the next. We could be smarter and drop out on
   * detecting a bad-user-or-pass error.
   */
  Pop3Client.prototype._thenAuthorize = function(cb) {
    this.state = 'authorization';

    this.authMethod = this.options.authMethods.shift();

    var user = this.options.username;
    var pass = this.options.password;
    var secret;
    switch(this.authMethod) {
    case 'apop':
      var match = /<.*?>/.exec(this._greetingLine || "");
      var apopTimestamp = match && match[0];
      if (!apopTimestamp) {
        // if the server doesn't support APOP, try the next method.
        this._thenAuthorize(cb);
      } else {
        secret = md5(apopTimestamp + pass).toLowerCase();
        this.protocol.sendRequest(
          'APOP', [user, secret], false, function(err, rsp) {
          if (err) {
            this._greetingLine = null; // try without APOP
            this._thenAuthorize(cb);
          } else {
            cb(); // ready!
          }
        }.bind(this));
      }
      break;
    case 'sasl':
      secret = btoa(user + '\x00' + user + '\x00' + pass);
      this.protocol.sendRequest(
        'AUTH', ['PLAIN', secret], false, function(err, rsp) {
        if (err) {
          this._thenAuthorize(cb);
        } else {
          cb(); // ready!
        }
      }.bind(this));
      break;
    case 'user-pass':
    default:
      this.protocol.sendRequest('USER', [user], false, function(err, rsp) {
        if (err) {
          cb && cb({
            scope: 'authentication',
            request: err.request,
            name: 'bad-user-or-pass',
            message: err.getStatusLine(),
            response: err,
          });
          return;
        }
        this.protocol.sendRequest('PASS', [pass], false, function(err, rsp) {
          if (err) {
            cb && cb({
              scope: 'authentication',
              request: null, // No request logging here; may leak password.
              name: 'bad-user-or-pass',
              message: err.getStatusLine(),
              response: err,
            });
            return;
          }
          cb();
        }.bind(this));
      }.bind(this));
      break;
    }
  }

  /*********************************************************************
   * MESSAGE FETCHING
   *
   * POP3 does not support granular partial retrieval; we can only
   * download a given number of _lines_ of the message (including
   * headers). Thus, in order to download snippets of messages (rather
   * than just the entire body), we have to guess at how many lines
   * it'll take to get enough MIME data to be able to parse out a
   * text/plain snippet.
   *
   * For now, we'll try to download a few KB of the message, which
   * should give plenty of data to form a snippet. We're aiming for a
   * sweet spot, because if the message is small enough, we can just
   * download the whole thing and be done.
   */

  /**
   * Issue a QUIT command to the server, persisting any DELE message
   * deletions you've enqueued. This also closes the connection.
   */
  Pop3Client.prototype.quit = function(cb) {
    this.state = 'disconnected';
    this.protocol.sendRequest('QUIT', [], false, function(err, rsp) {
      this.close();
      if (err) {
        cb && cb({
          scope: 'mailbox',
          request: err.request,
          name: 'server-problem',
          message: err.getStatusLine(),
          response: err,
        });
      } else {
        cb && cb();
      }
    }.bind(this));
  }

  /**
   * Load a mapping of server message numbers to UIDLs, so that we
   * can interact with messages stably across sessions. Additionally,
   * this fetches a LIST of the messages so that we have a list of
   * message sizes in addition to their UIDLs.
   */
  Pop3Client.prototype._loadMessageList = function(cb) {
    // if we've already loaded IDs this session, we don't need to
    // compute them again, because POP3 shows a frozen state of your
    // mailbox until you disconnect.
    if (this._messageList) {
      cb(null, this._messageList);
      return;
    }
    // First, get UIDLs for each message.
    this.protocol.sendRequest('UIDL', [], true, function(err, rsp) {
      if (err) {
        cb && cb({
          scope: 'mailbox',
          request: err.request,
          name: 'server-problem',
          message: err.getStatusLine(),
          response: err,
        });
        return;
      }

      var lines = rsp.getDataLines();
      for (var i = 0; i < lines.length; i++) {
        var words = lines[i].split(' ');
        var number = words[0];
        var uidl = words[1];
        this.idToUidl[number] = uidl;
        this.uidlToId[uidl] = number
      }
      // because POP3 servers process requests serially, the next LIST
      // will not run until after this completes.
    }.bind(this));

    // Then, get a list of messages so that we can track their size.
    this.protocol.sendRequest('LIST', [], true, function(err, rsp) {
      if (err) {
        cb && cb({
          scope: 'mailbox',
          request: err.request,
          name: 'server-problem',
          message: err.getStatusLine(),
          response: err,
        });
        return;
      }

      var lines = rsp.getDataLines();
      var allMessages = [];
      for (var i = 0; i < lines.length; i++) {
        var words = lines[i].split(' ');
        var number = words[0];
        var size = parseInt(words[1], 10);
        this.idToSize[number] = size;
        // Push the message onto the front, so that the last line
        // becomes the first message in allMessages. Most POP3 servers
        // seem to return messages in ascending date order, so we want
        // to process the newest messages first. (Tested with Dovecot,
        // Gmail, and AOL.) The resulting list here contains the most
        // recent message first.
        allMessages.unshift({
          uidl: this.idToUidl[number],
          size: size,
          number: number
        });
      }

      this._messageList = allMessages;
      cb && cb(null, allMessages);
    }.bind(this));
  }

  /**
   * Fetch the headers and snippets for all messages. Only retrieves
   * messages for which filterFunc(uidl) returns true.
   *
   * @param {object} opts
   * @param {function(uidl)} opts.filter Only store messages matching filter
   * @param {function(evt)} opts.progress Progress callback
   * @param {int} opts.checkpointInterval Call `checkpoint` every N messages
   * @param {int} opts.maxMessages Download _at most_ this many
   *   messages during this listMessages invocation. If we find that
   *   we would have to download more than this many messages, mark
   *   the rest as "overflow" messages that could be downloaded in a
   *   future sync iteration. (Default is infinite.)
   * @param {function(next)} opts.checkpoint Callback to periodically save state
   * @param {function(err, numSynced, overflowMessages)} cb
   *   Upon completion, returns the following data:
   *
   *   numSynced: The number of messages synced.
   *
   *   overflowMessages: An array of objects with the following structure:
   *
   *       { uidl: "", size: 0 }
   *
   *     Each message in overflowMessages was NOT downloaded. Instead,
   *     you should store those UIDLs for future retrieval as part of
   *     a "Download More Messages" operation.
   */
  Pop3Client.prototype.listMessages = function(opts, cb) {
    var filterFunc = opts.filter;
    var progressCb = opts.progress;
    var checkpointInterval = opts.checkpointInterval || null;
    var maxMessages = opts.maxMessages || Infinity;
    var checkpoint = opts.checkpoint;
    var overflowMessages = [];

    // Get a mapping of number->UIDL.
    this._loadMessageList(function(err, unfilteredMessages) {
      if (err) { cb && cb(err); return; }

      // Calculate which messages we would need to download.
      var totalBytes = 0;
      var bytesFetched = 0;
      var messages = [];
      var seenCount = 0;
      // Filter out unwanted messages.
      for (var i = 0; i < unfilteredMessages.length; i++) {
        var msgInfo = unfilteredMessages[i];
        if (!filterFunc || filterFunc(msgInfo.uidl)) {
          if (messages.length < maxMessages) {
            totalBytes += msgInfo.size;
            messages.push(msgInfo);
          } else {
            overflowMessages.push(msgInfo);
          }
        } else {
          seenCount++;
        }
      }

      console.log('POP3: listMessages found ' +
                  messages.length + ' new, ' +
                  overflowMessages.length + ' overflow, and ' +
                  seenCount + ' seen messages. New UIDLs:');

      messages.forEach(function(m) {
        console.log('POP3: ' + m.size + ' bytes: ' + m.uidl);
      });

      var totalMessages = messages.length;
      // If we don't provide a checkpoint interval, just do all
      // messages at once.
      if (!checkpointInterval) {
        checkpointInterval = totalMessages;
      }

      var firstErr = null;
      // Download all of the messages in batches.
      var nextBatch = function() {
        console.log('POP3: Next batch. Messages left: ' + messages.length);
        // If there are no more messages or our connection died, we're done.
        if (!messages.length || this.protocol.closed) {
          console.log('POP3: Sync complete. ' +
                      totalMessages + ' messages synced, ' +
                      overflowMessages.length + ' overflow messages.');
          cb && cb(firstErr, totalMessages, overflowMessages);
          return;
        }

        var batch = messages.splice(0, checkpointInterval);
        var latch = allback.latch();

        // Trigger a download for every message in the batch.
        batch.forEach(function(m, idx) {
          var messageDone = latch.defer(m.number);
          this.downloadPartialMessageByNumber(m.number, function(err, msg) {
            bytesFetched += m.size;
            if (err) {
              if (!firstErr) {
                firstErr = err;
              }
            } else {
              progressCb && progressCb({
                totalBytes: totalBytes,
                bytesFetched: bytesFetched,
                size: m.size,
                message: msg
              });
            }
            messageDone(err);
          });
        }.bind(this));

        // When all messages in this batch have completed, trigger the
        // next batch to begin download. If `checkpoint` is provided,
        // we'll wait for it to tell us to continue (so that we can
        // save the database periodically or perform other
        // housekeeping during sync).
        latch.then(function(results) {
          // figure out if we actually did work so we actually need to save.
          var anySaved = false;
          for (var num in results) {
            console.log('result', num, results[num]);
            if (!results[num][0]) {
              anySaved = true;
              break;
            }
          }
          if (checkpoint && anySaved) {
            console.log('POP3: Checkpoint.');
            checkpoint(nextBatch);
          } else {
            nextBatch();
          }
        });
      }.bind(this);

      // Kick it off, maestro.
      nextBatch();

    }.bind(this));
  }

  /**
   * Retrieve the full body (+ attachments) of a message given a UIDL.
   *
   * @param {string} uidl The message's UIDL as reported by the server.
   */
  Pop3Client.prototype.downloadMessageByUidl = function(uidl, cb) {
    this._loadMessageList(function(err) {
      if (err) {
        cb && cb(err);
      } else {
        this.downloadMessageByNumber(this.uidlToId[uidl], cb);
      }
    }.bind(this));
  }

  /**
   * Retrieve a portion of one message. The returned message is
   * normalized to the format needed by GELAM according to
   * `parseMime`.
   *
   * @param {string} number The message number (on the server)
   * @param {function(err, msg)} cb
   */
  // XXX: TODO: There are some roundtrips between strings and buffers
  // here. This is generally safe (converting to and from UTF-8), but
  // it creates unnecessary garbage. Clean this up when we switch over
  // to jsmime.
  Pop3Client.prototype.downloadPartialMessageByNumber = function(number, cb) {
    // Based on SNIPPET_SIZE_GOAL, calculate approximately how many
    // lines we'll need to fetch in order to roughly retrieve
    // SNIPPET_SIZE_GOAL bytes.
    var numLines = Math.floor(syncbase.POP3_SNIPPET_SIZE_GOAL / 80);
    this.protocol.sendRequest('TOP', [number, numLines],
                              true, function(err, rsp) {
      if(err) {
        cb && cb({
          scope: 'message',
          request: err.request,
          name: 'server-problem',
          message: err.getStatusLine(),
          response: err,
        });
        return;
      }

      var fullSize = this.idToSize[number];
      var data = rsp.getDataAsString();
      var isSnippet = (!fullSize || data.length < fullSize);
      // If we didn't get enough data, msg.body.bodyReps may be empty.
      // The values we use for retrieving snippets are
      // sufficiently large that we really shouldn't run into this
      // case in nearly all cases. We assume that the UI will
      // handle this (exceptional) case reasonably.
      cb(null, this.parseMime(data, isSnippet, number));
    }.bind(this));
  }

  /**
   * Retrieve a message in its entirety, given a server-centric number.
   *
   * @param {string} number The message number (on the server)
   * @param {function(err, msg)} cb
   */
  Pop3Client.prototype.downloadMessageByNumber = function(number, cb) {
    this.protocol.sendRequest('RETR', [number], true, function(err, rsp) {
      if(err) {
        cb && cb({
          scope: 'message',
          request: err.request,
          name: 'server-problem',
          message: err.getStatusLine(),
          response: err,
        });
        return;
      }
      cb(null, this.parseMime(rsp.getDataAsString(), false, number));
    }.bind(this));
  }

  /**
   * Retrieve a header from a MimeNode given a lowercase headerName.
   */
  function safeHeader(node, headerName, defaultValue) {
    var allHeaders = node.headers[headerName];
    if (allHeaders && allHeaders[0]) {
      return allHeaders[0].value;
    } else {
      return defaultValue || null;
    }
  }

  function safeHeaderParams(node, headerName) {
    var allHeaders = node.headers[headerName];
    if (allHeaders && allHeaders[0]) {
      return allHeaders[0].params || {};
    } else {
      return {};
    }
  }

  /**
   * Convert a MimeParser-intermediate MIME tree to a structure
   * format as parsable with imapchew. This allows us to reuse much of
   * the parsing code and maintain parity between IMAP and POP3.
   */
  function mimeTreeToStructure(node, partId, partMap, partialNode) {
    var typeInfo = {};
    typeInfo.part = partId || '1';
    typeInfo.type = node.contentType.value;
    typeInfo.parameters = safeHeaderParams(node, 'content-type');

    var dispositionValue = safeHeader(node, 'content-disposition');
    if (dispositionValue) {
      typeInfo.disposition = dispositionValue;
      typeInfo.dispositionParameters =
        safeHeaderParams(node, 'content-disposition');
    }
    typeInfo.id = safeHeader(node, 'content-id');
    typeInfo.encoding = 'binary'; // we already decoded it
    typeInfo.size = node.content && node.content.length || 0;
    typeInfo.description = null; // unsupported (unnecessary)
    typeInfo.lines = null; // unsupported (unnecessary)
    typeInfo.md5 = null; // unsupported (unnecessary)
    typeInfo.childNodes = [];

    // If the node was not a multipart node (i.e. it's supposed to
    // have content), it's just an empty node. MimeParser leaves
    // 'content' undefined, but actually we want an empty array.
    if (node.content == null && !/^multipart\//.test(typeInfo.type)) {
      node.content = new Uint8Array();
    }

    if (node.content != null) {
      partMap[typeInfo.part] = node.content;
      // If this node was only partially downloaded, note it as such
      // in a special key on partMap. We'll use this key to later
      // indicate that this part's size should be calculated based on
      // the bytes we have not downloaded yet.
      if (partialNode === node) {
        partMap['partial'] = typeInfo.part;
      }
    }

    if (node._childNodes.length) {
      for (var i = 0; i < node._childNodes.length; i++) {
        var child = node._childNodes[i];
        typeInfo.childNodes.push(mimeTreeToStructure(
          child, typeInfo.part + '.' + (i + 1), partMap, partialNode));
      }
    }
    return typeInfo;
  }

  // This function is made visible for test logic external to this module.
  Pop3Client.parseMime = function(content) {
    return Pop3Client.prototype.parseMime.call(this, content);
  }

  Pop3Client.prototype.parseMime = function(mimeContent, isSnippet, number) {
    var mp = new MimeParser();
    var lastNode;
    mp.write(mimefuncs.charset.encode(mimeContent, 'utf-8'));
    mp.end();
    // mimeparser does not generate onbody events for partial pieces of body
    // so we find the "last" node through tree-traversal:
    lastNode = mp.node;
    while (lastNode._currentChild && lastNode !== lastNode._currentChild) {
      lastNode = lastNode._currentChild;
    }

    var rootNode = mp.node;
    var partialNode = (isSnippet ? lastNode : null);
    var estSize = (number && this.idToSize[number]) || mimeContent.length;
    var content;
    var dateHeader = safeHeader(rootNode, 'date'), dateTS;
    // If we got a date, clamp it to now if it's trying to live in the future
    // or it's simply invalid.  Our rational for clamping is that we don't
    // want spammers to be able to permanently lodge their mails at the top of
    // the inbox or to otherwise upset our careful invariants.
    var now = dateMod.NOW();
    if (dateHeader) {
      dateTS = Date.parse(dateHeader);
      if (isNaN(dateTS) || dateTS > now) {
        dateTS = now;
      }
    } else {
      // If we don't have a date, then just use now as the date.  The rationale
      // for this is that we are already trusting the message's claimed
      // composition date, so it's not like this can be maliciously abused.
      dateTS = now;
    }

    var headerList = [];
    for (var key in rootNode.headers) {
      headerList.push(key + ': ' + rootNode.headers[key][0].initial + '\r\n');
    }

    var partMap = {}; // partId -> content
    var msg = {
      uid: number && this.idToUidl[number], // the server-given ID
      'header.fields[]': headerList.join(''),
      internaldate: dateTS && imapchew.formatImapDateTime(new Date(dateTS)),
      flags: [],
      bodystructure: mimeTreeToStructure(rootNode, '1', partMap, partialNode)
    };

    var rep = imapchew.chewHeaderAndBodyStructure(msg, null, null);
    var bodyRepIdx = imapchew.selectSnippetBodyRep(rep.header, rep.bodyInfo);

    // Calculate the proper size for all of the parts. Any part we've
    // seen will have been fully downloaded, so we have the whole
    // thing. We must just attribute the rest of the size to the one
    // unfinished part, whose partId is stored in partMap['partial'].
    var partSizes = {};
    var usedSize = 0;
    var partialPartKey = partMap['partial'];
    for (var k in partMap) {
      if (k === 'partial') { continue; };
      if (k !== partialPartKey) {
        usedSize += partMap[k].length;
        partSizes[k] = partMap[k].length;
      }
    }
    if (partialPartKey) {
      partSizes[partialPartKey] = estSize - usedSize;
    }

    for (var i = 0; i < rep.bodyInfo.bodyReps.length; i++) {
      var bodyRep = rep.bodyInfo.bodyReps[i];

      content = mimefuncs.charset.decode(partMap[bodyRep.part], 'utf-8');
      var req = {
        // If bytes is null, imapchew.updateMessageWithFetch knows
        // that we've fetched the entire thing. Passing in [-1, -1] as a
        // range tells imapchew that we're not done downloading it yet.
        bytes: (partialPartKey === bodyRep.part ? [-1, -1] : null),
        bodyRepIndex: i,
        createSnippet: i === bodyRepIdx,
      };

      if (content != null) {
        bodyRep.size = partSizes[bodyRep.part];
        var res = {
          bytesFetched: content.length,
          text: content
        };
        imapchew.updateMessageWithFetch(rep.header, rep.bodyInfo, req, res);
      }
    }


    // Convert attachments and related parts to Blobs if we've
    // downloaded the whole thing:
    for (var i = 0; i < rep.bodyInfo.relatedParts.length; i++) {
      var relatedPart = rep.bodyInfo.relatedParts[i];
      relatedPart.sizeEstimate = partSizes[relatedPart.part];
      content = partMap[relatedPart.part];
      if (content != null && partialPartKey !== relatedPart.part) {
        relatedPart.file = new Blob([content], {type: relatedPart.type});
      }
    }

    for (var i = 0; i < rep.bodyInfo.attachments.length; i++) {
      var att = rep.bodyInfo.attachments[i];
      content = partMap[att.part];
      att.sizeEstimate = partSizes[att.part];
      if (content != null && partialPartKey !== att.part &&
          mimeMapper.isSupportedType(att.type)) {
        att.file = new Blob([content], {type: att.type});
      }
    }

    // If it's a snippet and we aren't sure that we have attachments,
    // guess based on what we know.
    if (isSnippet &&
        !rep.header.hasAttachments &&
        (safeHeader(rootNode, 'x-ms-has-attach') ||
         /multipart\/mixed/.test(rootNode.contentType.value) ||
         estSize > syncbase.POP3_INFER_ATTACHMENTS_SIZE)) {
      rep.header.hasAttachments = true;
    }

    // If we haven't downloaded the entire message, we need to have
    // some way to tell the UI that we actually haven't downloaded all
    // of the bodyReps yet. We add this fake bodyRep here, indicating
    // that it isn't fully downloaded, so that when the user triggers
    // downloadBodyReps, we actually try to fetch the message. In
    // POP3, we _don't_ know that we have all bodyReps until we've
    // downloaded the whole thing. There could be parts hidden in the
    // data we haven't downloaded yet.
    rep.bodyInfo.bodyReps.push({
      type: 'fake', // not 'text' nor 'html', so it won't be rendered
      part: 'fake',
      sizeEstimate: 0,
      amountDownloaded: 0,
      isDownloaded: !isSnippet,
      content: null,
      size: 0,
    });

    // POP3 can't display the completely-downloaded-body until we've
    // downloaded the entire message, including attachments. So
    // unfortunately, no matter how much we've already downloaded, if
    // we haven't downloaded the whole thing, we can't start from the
    // middle.
    rep.header.bytesToDownloadForBodyDisplay = (isSnippet ? estSize : 0);

    // to fill: suid, id
    return rep;
  }

  /**
   * Display a buffer in a debug-friendly printable format, with
   * CRLFs escaped for easy protocol verification.
   */
  function bufferToPrintable(line) {
    var s = '';
    if (Array.isArray(line)) {
      line.forEach(function(l) {
        s += bufferToPrintable(l) + '\n';
      });
      return s;
    }
    for (var i = 0; i < line.length; i++) {
      var c = String.fromCharCode(line[i]);
      if (c === '\r') { s += '\\r'; }
      else if (c === '\n') { s += '\\n'; }
      else { s += c; }
    }
    return s;
  }

}); // end define
