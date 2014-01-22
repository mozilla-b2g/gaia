
/**
 * Remoted network API that tries to look like node.js's "net" API.  We are
 * expected/required to run in a worker thread where we don't have direct
 * access to mozTCPSocket so everything has to get remitted to the main thread.
 * Our counterpart is mailapi/worker-support/net-main.js
 *
 *
 * ## Sending lots of data: flow control, Blobs ##
 *
 * mozTCPSocket provides a flow-control mechanism (the return value to send
 * indicates whether we've crossed a buffering boundary and 'ondrain' tells us
 * when all buffered data has been sent), but does not yet support enqueueing
 * Blobs for processing (which is part of the proposed standard at
 * http://www.w3.org/2012/sysapps/raw-sockets/).  Also, the raw-sockets spec
 * calls for generating the 'drain' event once our buffered amount goes back
 * under the internal buffer target rather than waiting for it to hit zero like
 * mozTCPSocket.
 *
 * Our main desire right now for flow-control is to avoid using a lot of memory
 * and getting killed by the OOM-killer.  As such, flow control is not important
 * to us if we're just sending something that we're already keeping in memory.
 * The things that will kill us are giant things like attachments (or message
 * bodies we are quoting/repeating, potentially) that we are keeping as Blobs.
 *
 * As such, rather than echoing the flow-control mechanisms over to this worker
 * context, we just allow ourselves to write() a Blob and have the net-main.js
 * side take care of streaming the Blobs over the network.
 *
 * Note that successfully sending a lot of data may entail holding a wake-lock
 * to avoid having the network device we are using turned off in the middle of
 * our sending.  The network-connection abstraction is not currently directly
 * involved with the wake-lock management, but I could see it needing to beef up
 * its error inference in terms of timeouts/detecting disconnections so we can
 * avoid grabbing a wi-fi wake-lock, having our connection quietly die, and then
 * we keep holding the wi-fi wake-lock for much longer than we should.
 *
 * ## Supported API Surface ##
 *
 * We make sure to expose the following subset of the node.js API because we
 * have consumers that get upset if these do not exist:
 *
 * Attributes:
 * - encrypted (false, this is not the tls byproduct)
 * - destroyed
 *
 * Methods:
 * - setKeepAlive(Boolean)
 * - write(Buffer)
 * - end
 *
 * Events:
 * - "connect"
 * - "close"
 * - "end"
 * - "data"
 * - "error"
 **/
define('net',['require','exports','module','util','events','mailapi/worker-router'],function(require, exports, module) {

function debug(str) {
  //dump("NetSocket: (" + Date.now() + ") :" + str + "\n");
}

var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    router = require('mailapi/worker-router');

var routerMaker = router.registerInstanceType('netsocket');

function NetSocket(port, host, crypto) {
  var cmdMap = {
    onopen: this._onconnect.bind(this),
    onerror: this._onerror.bind(this),
    ondata: this._ondata.bind(this),
    onclose: this._onclose.bind(this)
  };
  var routerInfo = routerMaker.register(function(data) {
    cmdMap[data.cmd](data.args);
  });
  this._sendMessage = routerInfo.sendMessage;
  this._unregisterWithRouter = routerInfo.unregister;

  var args = [host, port,
              {
                // Bug 784816 is changing useSSL into useSecureTransport for
                // spec compliance.  Use both during the transition period.
                useSSL: crypto, useSecureTransport: crypto,
                binaryType: 'arraybuffer'
              }];
  this._sendMessage('open', args);

  EventEmitter.call(this);

  this.destroyed = false;
}
exports.NetSocket = NetSocket;
util.inherits(NetSocket, EventEmitter);
NetSocket.prototype.setTimeout = function() {
};
NetSocket.prototype.setKeepAlive = function(shouldKeepAlive) {
};
// The semantics of node.js's socket.write does not take ownership and that's
// how our code uses it, so we can't use transferrables by default.  However,
// there is an optimization we want to perform related to Uint8Array.subarray().
//
// All the subarray does is create a view on the underlying buffer.  This is
// important and notable because the structured clone implementation for typed
// arrays and array buffers is *not* clever; it just serializes the entire
// underlying buffer and the typed array as a view on that.  (This does have
// the upside that you can transfer a whole bunch of typed arrays and only one
// copy of the buffer.)  The good news is that ArrayBuffer.slice() does create
// an entirely new copy of the buffer, so that works with our semantics and we
// can use that to transfer only what needs to be transferred.
NetSocket.prototype.write = function(u8array) {
  if (u8array instanceof Blob) {
    // We always send blobs in their entirety; you should slice the blob and
    // give us that if that's what you want.
    this._sendMessage('write', [u8array]);
    return;
  }

  var sendArgs;
  // Slice the underlying buffer and transfer it if the array is a subarray
  if (u8array.byteOffset !== 0 ||
      u8array.length !== u8array.buffer.byteLength) {
    var buf = u8array.buffer.slice(u8array.byteOffset,
                                   u8array.byteOffset + u8array.length);
    this._sendMessage('write',
                      [buf, 0, buf.byteLength],
                      [buf]);
  }
  else {
    this._sendMessage('write',
                      [u8array.buffer, u8array.byteOffset, u8array.length]);
  }
};
NetSocket.prototype.upgradeToSecure = function() {
  this._sendMessage('upgradeToSecure', []);
};
NetSocket.prototype.end = function() {
  if (this.destroyed)
    return;
  this._sendMessage('end');
  this.destroyed = true;
  this._unregisterWithRouter();
};

NetSocket.prototype._onconnect = function() {
  this.emit('connect');
};
NetSocket.prototype._onerror = function(err) {
  this.emit('error', err);
};
NetSocket.prototype._ondata = function(data) {
  var buffer = Buffer(data);
  this.emit('data', buffer);
};
NetSocket.prototype._onclose = function() {
  this.emit('close');
  this.emit('end');
};

exports.connect = function(port, host, crypto) {
  return new NetSocket(port, host, !!crypto);
};

}); // end define
;
define('pop3/transport',['exports'], function(exports) {

  /**
   * This file contains the following classes:
   *
   * - Pop3Parser: Parses incoming POP3 requests
   * - Pop3Protocol: Uses the Pop3Parser to match requests up with responses
   * - Request: Encapsulates a request to the server
   * - Response: Encapsulates a response from the server
   *
   * The Pop3Client (in pop3.js) hooks together a socket and an
   * instance of Pop3Protocol to form a complete client. See pop3.js
   * for a more detailed description of the hierarchy.
   */

  var setTimeout = window.setTimeout.bind(window);
  var clearTimeout = window.clearTimeout.bind(window);

  var MAX_LINE_LENGTH = 512; // per POP3 spec, including CRLF
  var CR = '\r'.charCodeAt(0);
  var LF = '\n'.charCodeAt(0);
  var PERIOD = '.'.charCodeAt(0);
  var PLUS = '+'.charCodeAt(0);
  var MINUS = '-'.charCodeAt(0);
  var SPACE = ' '.charCodeAt(0);

  var textEncoder = new TextEncoder('utf-8', { fatal: false });
  var textDecoder = new TextDecoder('utf-8', { fatal: false });

  function concatBuffers(a, b) {
    var buffer = new Uint8Array(a.byteLength + b.byteLength);
    buffer.set(a, 0);
    buffer.set(b, a.byteLength);
    return buffer;
  }

  /**
   * Pop3Parser receives binary data (presumably from a socket) and
   * parse it according to the POP3 spec:
   *
   *   var parser = new Pop3Parser();
   *   parser.push(myBinaryData);
   *   var rsp = parser.extractResponse(false);
   *   if (rsp) {
   *     // do something with the response
   *   }
   */
  function Pop3Parser() {
    this.buffer = new Uint8Array(0); // data not yet parsed into lines
    this.unprocessedLines = [];
  }

  /**
   * Add new data to be parsed. To actually parse the incoming data
   * (to see if there is enough data to extract a full response), call
   * `.extractResponse()`.
   *
   * @param {Uint8Array} data
   */
  Pop3Parser.prototype.push = function(data) {
    // append the data to be processed
    var buffer = this.buffer = concatBuffers(this.buffer, data);

    // pull out full lines
    for (var i = 0; i < buffer.length - 1; i++) {
      if (buffer[i] === CR && buffer[i + 1] === LF) {
        var end = i + 1;
        if (end > MAX_LINE_LENGTH) {
          // Sadly, servers do this, so we can't bail here.
        }
        this.unprocessedLines.push(buffer.slice(0, end + 1));
        buffer = this.buffer = buffer.slice(end + 1);
        i = -1;
      }
    }
  }

  /**
   * Attempt to parse and return a single message from the buffered
   * data. Since the POP3 protocol does not provide a foolproof way to
   * determine whether a given message is multiline without tracking
   * request state, you must specify whether or not the response is
   * expected to be multiline.
   *
   * Multiple responses may be available; you should call
   * `.extractResponse()` repeatedly until no more responses are
   * available. This method returns null if there was not enough data
   * to parse and return a response.
   *
   * @param {boolean} multiline true to parse a multiline response.
   * @return {Response|null}
   */
  Pop3Parser.prototype.extractResponse = function(multiline) {
    if (!this.unprocessedLines.length) {
      return null;
    }
    if (this.unprocessedLines[0][0] !== PLUS) {
      multiline = false; // Negative responses are never multiline.
    }
    if (!multiline) {
      return new Response([this.unprocessedLines.shift()], false);
    } else {
      var endLineIndex = -1;
      for (var i = 1; i < this.unprocessedLines.length; i++) {
        var line = this.unprocessedLines[i];
        if (line.byteLength === 3 &&
            line[0] === PERIOD && line[1] === CR && line[2] === LF) {
          endLineIndex = i;
          break;
        }
      }
      if (endLineIndex === -1) {
        return null;
      }
      var lines = this.unprocessedLines.splice(0, endLineIndex + 1);
      lines.pop(); // remove final ".\r\n" line
      // the first line cannot be stuffed (it's the command OK/ERR
      // response). Other lines may be period-stuffed.
      for (var i = 1; i < endLineIndex; i++) {
        if (lines[i][0] === PERIOD) {
          lines[i] = lines[i].slice(1);
        }
      }
      return new Response(lines, true);
    }
  }

  /**
   * Represent a POP3 response (both success and failure). You should
   * not have to instantiate this class directly; Pop3Parser returns
   * these objects from `Pop3Parser.extractResponse()`.
   *
   * @param {UInt8Array[]} lines
   * @param {boolean} isMultiline
   */
  function Response(lines, isMultiline) {
    this.lines = lines; // list of UInt8Arrays
    this.isMultiline = isMultiline;
    this.ok = (this.lines[0][0] === PLUS);
    this.err = !this.ok;
    this.request = null;
  }

  /**
   * Return the description text for the status line as a string.
   */
  Response.prototype.getStatusLine = function() {
    return this.getLineAsString(0).replace(/^(\+OK|-ERR) /, '');
  }

  /**
   * Return the line at `index` as a string.
   *
   * @param {int} index
   * @return {String}
   */
  Response.prototype.getLineAsString = function(index) {
    return textDecoder.decode(this.lines[index]);
  }

  /**
   * Return an array of strings, one for each line, including CRLFs.
   * If you want to parse the data from a response, use
   * `.getDataLines()`.
   *
   * @return {String[]}
   */
  Response.prototype.getLinesAsString = function() {
    var lines = [];
    for (var i = 0; i < this.lines.length; i++) {
      lines.push(this.getLineAsString(i));
    }
    return lines;
  }

  /**
   * Return an array of strings, _excluding_ CRLFs, starting from the
   * line after the +OK/-ERR line.
   */
  Response.prototype.getDataLines = function() {
    var lines = [];
    for (var i = 1; i < this.lines.length; i++) {
      var line = this.getLineAsString(i);
      lines.push(line.slice(0, line.length - 2)); // strip CRLF
    }
    return lines;
  }

  /**
   * Return the data portion of a multiline response as a string,
   * with the lines' CRLFs intact.
   */
  Response.prototype.getDataAsString = function() {
    var lines = [];
    for (var i = 1; i < this.lines.length; i++) {
      lines.push(this.getLineAsString(i));
    }
    return lines.join(''); // lines already have '\r\n'
  }

  /**
   * Return a string representation of the message, primarily for
   * debugging purposes.
   */
  Response.prototype.toString = function() {
    return this.getLinesAsString().join('\r\n');
  }

  /**
   * Represent a POP3 request, with enough data to allow the parser
   * to parse out a response and invoke a callback upon receiving a
   * response.
   *
   * @param {string} command The command, like RETR, USER, etc.
   * @param {string[]} args Arguments to the command, as an array.
   * @param {boolean} expectMultiline Whether or not the response will
   *                                  be multiline.
   * @param {function(err, rsp)} cb The callback to invoke when a
   *                                response is received.
   */
  function Request(command, args, expectMultiline, cb) {
    this.command = command;
    this.args = args;
    this.expectMultiline = expectMultiline;
    this.onresponse = cb || null;
  }

  exports.Request = Request;

  /**
   * Encode the request into a byte array suitable for transport over
   * a socket.
   */
  Request.prototype.toByteArray = function() {
    return textEncoder.encode(
      this.command + (this.args.length ? ' ' + this.args.join(' ') : '') + '\r\n');
  }

  /**
   * Trigger the response callback with '-ERR desc\r\n'.
   */
  Request.prototype._respondWithError = function(desc) {
    var rsp = new Response([textEncoder.encode(
      '-ERR ' + desc + '\r\n')], false);
    rsp.request = this;
    this.onresponse(rsp, null);
  }

  /**
   * Couple a POP3 parser with a request/response model, such that
   * you can easily hook Pop3Protocol up to a socket (or other
   * transport) to get proper request/response semantics.
   *
   * You must attach a handler to `.onsend`, which should fire data
   * across the wire. Similarly, you should call `.onreceive(data)` to
   * pass data back in from the socket.
   */
  function Pop3Protocol() {
    this.parser = new Pop3Parser();
    this.onsend = function(data) {
      throw new Error("You must implement Pop3Protocol.onsend to send data.");
    };
    this.unsentRequests = []; // if not pipelining, queue requests one at a time
    this.pipeline = false;
    this.pendingRequests = [];
    this.closed = false;
  }

  exports.Response = Response;
  exports.Pop3Protocol = Pop3Protocol;

  /**
   * Send a request to the server. Upon receiving a response, the
   * callback will be invoked, node-style, with an err or a response.
   * Negative replies (-ERR) are returned as an error to the callback;
   * positive replies (+OK) as a response. Socket errors are returned
   * as an error to the callback.
   *
   * @param {string} cmd The command like USER, RETR, etc.
   * @param {string[]} args An array of arguments to the command.
   * @param {boolean} expectMultiline Whether or not the response will
   *                                  be multiline.
   * @param {function(err, rsp)} cb The callback to invoke upon
   *                                receipt of a response.
   */
  Pop3Protocol.prototype.sendRequest = function(
    cmd, args, expectMultiline, cb) {
    var req;
    if (cmd instanceof Request) {
      req = cmd;
    } else {
      req = new Request(cmd, args, expectMultiline, cb);
    }

    if (this.closed) {
      req._respondWithError('(request sent after connection closed)');
      return;
    }

    if (this.pipeline || this.pendingRequests.length === 0) {
      this.onsend(req.toByteArray());
      this.pendingRequests.push(req);
    } else {
      this.unsentRequests.push(req);
    }
  }

  /**
   * Call this function to send received data to the parser. This
   * method automatically calls the appropriate response callback for
   * its respective request.
   */
  Pop3Protocol.prototype.onreceive = function(data) {
    this.parser.push(data);

    var response;
    while (true) {
      var req = this.pendingRequests[0];
      response = this.parser.extractResponse(req && req.expectMultiline);
      if (!response) {
        break;
      } else if (!req) {
        // It's unclear how to handle this in the most nondestructive way;
        // if we receive an unsolicited response, something has gone horribly
        // wrong, and it's unlikely that we'll be able to recover.
        console.error('Unsolicited response from server: ' + response);
        break;
      }
      response.request = req;
      this.pendingRequests.shift();
      if (this.unsentRequests.length) {
        this.sendRequest(this.unsentRequests.shift());
      }
      if (req.onresponse) {
        if (response.err) {
          req.onresponse(response, null);
        } else {
          req.onresponse(null, response);
        }
      }
    }
  }

  /**
   * Call this function when the socket attached to this protocol is
   * closed. Any current requests that have been enqueued but not yet
   * responded to will be sent a dummy "-ERR" response, indicating
   * that the underlying connection closed without actually
   * responding. This avoids the case where we hang if we never
   * receive a response from the server.
   */
  Pop3Protocol.prototype.onclose = function() {
    this.closed = true;
    var requestsToRespond = this.pendingRequests.concat(this.unsentRequests);
    this.pendingRequests = [];
    this.unsentRequests = [];
    for (var i = 0; i < requestsToRespond.length; i++) {
      var req = requestsToRespond[i];
      req._respondWithError('(connection closed, no response)');
    }
  }
});

/**
 *
 **/

define('mailapi/imap/imapchew',
  [
    'mimelib',
    'mailapi/db/mail_rep',
    '../mailchew',
    'exports'
  ],
  function(
    $mimelib,
    mailRep,
    $mailchew,
    exports
  ) {

function parseRfc2231CharsetEncoding(s) {
  // charset'lang'url-encoded-ish
  var match = /^([^']*)'([^']*)'(.+)$/.exec(s);
  if (match) {
    // we can convert the dumb encoding into quoted printable.
    return $mimelib.parseMimeWords(
      '=?' + (match[1] || 'us-ascii') + '?Q?' +
        match[3].replace(/%/g, '=') + '?=');
  }
  return null;
}

/**
 * Process the headers and bodystructure of a message to build preliminary state
 * and determine what body parts to fetch.  The list of body parts will be used
 * to issue another fetch request, and those results will be passed to
 * `chewBodyParts`.
 *
 * For now, our stop-gap heuristics for content bodies are:
 * - pick text/plain in multipart/alternative
 * - recurse into other multipart types looking for an alterntive that has
 *    text.
 * - do not recurse into message/rfc822
 * - ignore/fail-out messages that lack a text part, skipping to the next
 *    task.  (This should not happen once we support HTML, as there are cases
 *    where there are attachments without any body part.)
 * - Append text body parts together; there is no benefit in separating a
 *    mailing list footer from its content.
 *
 * For attachments, our heuristics are:
 * - only like them if they have filenames.  We will find this as "name" on
 *    the "content-type" or "filename" on the "content-disposition", quite
 *    possibly on both even.  For imap.js, "name" shows up in the "params"
 *    dict, and filename shows up in the "disposition" dict.
 * - ignore crypto signatures, even though they are named.  S/MIME gives us
 *    "smime.p7s" as an application/pkcs7-signature under a multipart/signed
 *    (that the server tells us is "signed").  PGP in MIME mode gives us
 *    application/pgp-signature "signature.asc" under a multipart/signed.
 *
 * The next step in the plan is to get an HTML sanitizer exposed so we can
 *  support text/html.  That will also imply grabbing multipart/related
 *  attachments.
 *
 * @typedef[ChewRep @dict[
 *   @key[bodyReps @listof[ImapJsPart]]
 *   @key[attachments @listof[AttachmentInfo]]
 *   @key[relatedParts @listof[RelatedPartInfo]]
 * ]]
 * @return[ChewRep]
 */
function chewStructure(msg) {
  // imap.js builds a bodystructure tree using lists.  All nodes get wrapped
  //  in a list so they are element zero.  Children (which get wrapped in
  //  their own list) follow.
  //
  // Examples:
  //   text/plain =>
  //     [{text/plain}]
  //   multipart/alternative with plaintext and HTML =>
  //     [{alternative} [{text/plain}] [{text/html}]]
  //   multipart/mixed text w/attachment =>
  //     [{mixed} [{text/plain}] [{application/pdf}]]
  var attachments = [], bodyReps = [], unnamedPartCounter = 0,
      relatedParts = [];

  /**
   * Sizes are the size of the encoded string, not the decoded value.
   */
  function estimatePartSizeInBytes(partInfo) {
    var encoding = partInfo.encoding.toLowerCase();
    // Base64 encodes 3 bytes in 4 characters with padding that always
    // causes the encoding to take 4 characters.  The max encoded line length
    // (ignoring CRLF) is 76 bytes, with 72 bytes also fairly common.
    // As such, a 78=19*4+2 character line encodes 57=19*3 payload bytes and
    // we can use that as a rough estimate.
    if (encoding === 'base64') {
      return Math.floor(partInfo.size * 57 / 78);
    }
    // Quoted printable is hard to predict since only certain things need
    // to be encoded.  It could be perfectly efficient if the source text
    // has a bunch of newlines built-in.
    else if (encoding === 'quoted-printable') {
      // Let's just provide an upper-bound of perfectly efficient.
      return partInfo.size;
    }
    // No clue; upper bound.
    return partInfo.size;
  }

  function chewLeaf(branch) {
    var partInfo = branch[0], i,
        filename, disposition;

    // - Detect named parts; they could be attachments
    // filename via content-type 'name' parameter
    if (partInfo.params && partInfo.params.name) {
      filename = $mimelib.parseMimeWords(partInfo.params.name);
    }
    // filename via content-type 'name' with charset/lang info
    else if (partInfo.params && partInfo.params['name*']) {
      filename = parseRfc2231CharsetEncoding(
                   partInfo.params['name*']);
    }
    // rfc 2231 stuff:
    // filename via content-disposition filename without charset/lang info
    else if (partInfo.disposition && partInfo.disposition.params &&
             partInfo.disposition.params.filename) {
      filename = $mimelib.parseMimeWords(partInfo.disposition.params.filename);
    }
    // filename via content-disposition filename with charset/lang info
    else if (partInfo.disposition && partInfo.disposition.params &&
             partInfo.disposition.params['filename*']) {
      filename = parseRfc2231CharsetEncoding(
                   partInfo.disposition.params['filename*']);
    }
    else {
      filename = null;
    }

    // - Start from explicit disposition, make attachment if non-displayable
    if (partInfo.disposition)
      disposition = partInfo.disposition.type.toLowerCase();
    // UNTUNED-HEURISTIC (need test cases)
    // Parts with content ID's explicitly want to be referenced by the message
    // and so are inline.  (Although we might do well to check if they actually
    // are referenced.  This heuristic could be very wrong.)
    else if (partInfo.id)
      disposition = 'inline';
    else if (filename || partInfo.type !== 'text')
      disposition = 'attachment';
    else
      disposition = 'inline';

    // Some clients want us to display things inline that we simply can't
    // display (historically and currently, PDF) or that our usage profile
    // does not want to automatically download (in the future, PDF, because
    // they can get big.)
    if (partInfo.type !== 'text' &&
        partInfo.type !== 'image')
      disposition = 'attachment';

    // - But we don't care if they are signatures...
    if ((partInfo.type === 'application') &&
        (partInfo.subtype === 'pgp-signature' ||
         partInfo.subtype === 'pkcs7-signature'))
      return true;

    function stripArrows(s) {
      if (s[0] === '<')
        return s.slice(1, -1);
      return s;
    }

    function makePart(partInfo, filename) {

      return mailRep.makeAttachmentPart({
        name: filename || 'unnamed-' + (++unnamedPartCounter),
        contentId: partInfo.id ? stripArrows(partInfo.id) : null,
        type: (partInfo.type + '/' + partInfo.subtype).toLowerCase(),
        part: partInfo.partID,
        encoding: partInfo.encoding && partInfo.encoding.toLowerCase(),
        sizeEstimate: estimatePartSizeInBytes(partInfo),
        file: null,
        /*
        charset: (partInfo.params && partInfo.params.charset &&
                  partInfo.params.charset.toLowerCase()) || undefined,
        textFormat: (partInfo.params && partInfo.params.format &&
                     partInfo.params.format.toLowerCase()) || undefined
         */
      });
    }

    function makeTextPart(partInfo) {
      return mailRep.makeBodyPart({
        type: partInfo.subtype,
        part: partInfo.partID,
        sizeEstimate: partInfo.size,
        amountDownloaded: 0,
        // its important to know that sizeEstimate and amountDownloaded
        // do _not_ determine if the bodyRep is fully downloaded; the
        // estimated amount is not reliable
        // Zero-byte bodies are assumed to be accurate and we treat the file
        // as already downloaded.
        isDownloaded: partInfo.size === 0,
        // full internal IMAP representation
        // it would also be entirely appropriate to move
        // the information on the bodyRep directly?
        _partInfo: partInfo.size ? partInfo : null,
        content: ''
      });
    }

    if (disposition === 'attachment') {
      attachments.push(makePart(partInfo, filename));
      return true;
    }

    // - We must be an inline part or structure
    switch (partInfo.type) {
      // - related image
      case 'image':
        relatedParts.push(makePart(partInfo, filename));
        return true;
        break;
      // - content
      case 'text':
        if (partInfo.subtype === 'plain' ||
            partInfo.subtype === 'html') {
          bodyReps.push(makeTextPart(partInfo));
          return true;
        }
        break;
    }
    return false;
  }

  function chewMultipart(branch) {
    var partInfo = branch[0], i;

    // - We must be an inline part or structure
    // I have no idea why the multipart is the 'type' rather than the subtype?
    switch (partInfo.subtype) {
      // - for alternative, scan from the back to find the first part we like
      // XXX I believe in Thunderbird we observed some ridiculous misuse of
      // alternative that we'll probably want to handle.
      case 'alternative':
        for (i = branch.length - 1; i >= 1; i--) {
          var subPartInfo = branch[i][0];

          switch(subPartInfo.type) {
            case 'text':
              // fall out for subtype checking
              break;
            case 'multipart':
              // this is probably HTML with attachments, let's give it a try
              if (chewMultipart(branch[i]))
                return true;
              break;
            default:
              // no good, keep going
              continue;
          }

          switch (subPartInfo.subtype) {
            case 'html':
            case 'plain':
              // (returns true if successfully handled)
              if (chewLeaf(branch[i]))
                return true;
          }
        }
        // (If we are here, we failed to find a valid choice.)
        return false;
      // - multipart that we should recurse into
      case 'mixed':
      case 'signed':
      case 'related':
        for (i = 1; i < branch.length; i++) {
          if (branch[i].length > 1)
            chewMultipart(branch[i]);
          else
            chewLeaf(branch[i]);
        }
        return true;

      default:
        console.warn('Ignoring multipart type:', partInfo.subtype);
        return false;
    }
  }

  if (msg.structure.length > 1)
    chewMultipart(msg.structure);
  else
    chewLeaf(msg.structure);

  return {
    bodyReps: bodyReps,
    attachments: attachments,
    relatedParts: relatedParts,
  };
};

exports.chewHeaderAndBodyStructure =
  function(msg, folderId, newMsgId) {
  // begin by splitting up the raw imap message
  var parts = chewStructure(msg);
  var rep = {};

  rep.header = mailRep.makeHeaderInfo({
    // the FolderStorage issued id for this message (which differs from the
    // IMAP-server-issued UID so we can do speculative offline operations like
    // moves).
    id: newMsgId,
    srvid: msg.id,
    // The sufficiently unique id is a concatenation of the UID onto the
    // folder id.
    suid: folderId + '/' + newMsgId,
    // The message-id header value; as GUID as get for now; on gmail we can
    // use their unique value, or if we could convince dovecot to tell us, etc.
    guid: msg.msg.meta.messageId,
    // mailparser models from as an array; we do not.
    author: msg.msg.from && msg.msg.from[0] ||
              // we require a sender e-mail; let's choose an illegal default as
              // a stopgap so we don't die.
              { address: 'missing-address@example.com' },
    to: ('to' in msg.msg) ? msg.msg.to : null,
    cc: ('cc' in msg.msg) ? msg.msg.cc : null,
    bcc: ('bcc' in msg.msg) ? msg.msg.bcc : null,

    replyTo: ('reply-to' in msg.msg.parsedHeaders) ?
               msg.msg.parsedHeaders['reply-to'] : null,

    date: msg.date,
    flags: msg.flags,
    hasAttachments: parts.attachments.length > 0,
    subject: msg.msg.subject || null,

    // we lazily fetch the snippet later on
    snippet: null
  });


  rep.bodyInfo = mailRep.makeBodyInfo({
    date: msg.date,
    size: 0,
    attachments: parts.attachments,
    relatedParts: parts.relatedParts,
    references: msg.msg.references,
    bodyReps: parts.bodyReps
  });

  return rep;
};

/**
 * Fill a given body rep with the content from fetching
 * part or the entire body of the message...
 *
 *    var body = ...;
 *    var header = ...;
 *    var content = (some fetched content)..
 *
 *    $imapchew.updateMessageWithFetch(
 *      header,
 *      bodyInfo,
 *      {
 *        bodyRepIndex: 0,
 *        text: '',
 *        buffer: Uint8Array|Null,
 *        bytesFetched: n,
 *        bytesRequested: n
 *      }
 *    );
 *
 *    // what just happend?
 *    // 1. the body.bodyReps[n].content is now the value of content.
 *    //
 *    // 2. we update .amountDownloaded with the second argument
 *    //    (number of bytes downloaded).
 *    //
 *    // 3. if snippet has not bee set on the header we create the snippet
 *    //    and set its value.
 *
 */
exports.updateMessageWithFetch = function(header, body, req, res, _LOG) {
  var bodyRep = body.bodyReps[req.bodyRepIndex];

  // check if the request was unbounded or we got back less bytes then we
  // requested in which case the download of this bodyRep is complete.
  if (!req.bytes || res.bytesFetched < req.bytes[1]) {
    bodyRep.isDownloaded = true;

    // clear private space for maintaining parser state.
    bodyRep._partInfo = null;
  }

  if (!bodyRep.isDownloaded && res.buffer) {
    bodyRep._partInfo.pendingBuffer = res.buffer;
  }

  bodyRep.amountDownloaded += res.bytesFetched;

  var data = $mailchew.processMessageContent(
    res.text, bodyRep.type, bodyRep.isDownloaded, req.createSnippet, _LOG
  );

  if (req.createSnippet) {
    header.snippet = data.snippet;
  }
  if (bodyRep.isDownloaded)
    bodyRep.content = data.content;
};

/**
 * Selects a desirable snippet body rep if the given header has no snippet.
 */
exports.selectSnippetBodyRep = function(header, body) {
  if (header.snippet)
    return -1;

  var bodyReps = body.bodyReps;
  var len = bodyReps.length;

  for (var i = 0; i < len; i++) {
    if (exports.canBodyRepFillSnippet(bodyReps[i])) {
      return i;
    }
  }

  return -1;
};

/**
 * Determines if a given body rep can be converted into a snippet. Useful for
 * determining which body rep to use when downloading partial bodies.
 *
 *
 *    var bodyInfo;
 *    $imapchew.canBodyRepFillSnippet(bodyInfo.bodyReps[0]) // true/false
 *
 */
exports.canBodyRepFillSnippet = function(bodyRep) {
  return (
    bodyRep &&
    bodyRep.type === 'plain' ||
    bodyRep.type === 'html'
  );
};


/**
 * Calculates and returns the correct estimate for the number of
 * bytes to download before we can display the body. For IMAP, that
 * includes the bodyReps and related parts. (POP3 is different.)
 */
exports.calculateBytesToDownloadForImapBodyDisplay = function(body) {
  var bytesLeft = 0;
  body.bodyReps.forEach(function(rep) {
    if (!rep.isDownloaded) {
      bytesLeft += rep.sizeEstimate - rep.amountDownloaded;
    }
  });
  body.relatedParts.forEach(function(part) {
    if (!part.file) {
      bytesLeft += part.sizeEstimate;
    }
  });
  return bytesLeft;
}



}); // end define
;
'use strict';

// XXX: This is copied from shared/js/mime_mapper.js until the
// download manager ships.

/**
 * MimeMapper helps gaia apps to decide the mapping of mimetype and extension.
 * The use cases often happen when apps need to know about the exact
 * mimetypes or extensions, such as to delegate the open web activity, we must
 * have suitable mimetypes or extensions to request the right activity
 *
 * The mapping is basically created according to:
 * http://en.wikipedia.org/wiki/Internet_media_type
 *
 * The supported formats are considered base on the deviceStorage properties:
 * http://dxr.mozilla.org/mozilla-central/toolkit/content/
 * devicestorage.properties
 *
 */
define('pop3/mime_mapper',[],function() {
return {
  // This list only contains the extensions we currently supported
  // We should make it more complete for further usages
  _typeToExtensionMap: {
    // Image
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/bmp': 'bmp',
    // Audio
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/ogg': 'ogg',
    'audio/webm': 'webm',
    'audio/3gpp': '3gp',
    'audio/amr': 'amr',
    // Video
    'video/mp4': 'mp4',
    'video/mpeg': 'mpg',
    'video/ogg': 'ogg',
    'video/webm': 'webm',
    'video/3gpp': '3gp',
    // Application
    // If we want to support some types, like pdf, just add
    // 'application/pdf': 'pdf'
    'application/vcard': 'vcf',
    // Text
    'text/vcard': 'vcf',
    'text/x-vcard': 'vcf'
  },

  // This list only contains the mimetypes we currently supported
  // We should make it more complete for further usages
  _extensionToTypeMap: {
    // Image
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'jpe': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    // Audio
    'mp3': 'audio/mpeg',
    'm4a': 'audio/mp4',
    'm4b': 'audio/mp4',
    'm4p': 'audio/mp4',
    'm4r': 'audio/mp4',
    'aac': 'audio/aac',
    'opus': 'audio/ogg',
    'amr': 'audio/amr',
    // Video
    'mp4': 'video/mp4',
    'mpeg': 'video/mpeg',
    'mpg': 'video/mpeg',
    'ogv': 'video/ogg',
    'ogx': 'video/ogg',
    'webm': 'video/webm',
    '3gp': 'video/3gpp',
    'ogg': 'video/ogg',
    // Application
    // If we want to support some extensions, like pdf, just add
    // 'pdf': 'application/pdf'
    // Text
    'vcf': 'text/vcard'
  },
  _parseExtension: function(filename) {
    var array = filename.split('.');
    return array.length > 1 ? array.pop() : '';
  },

  isSupportedType: function(mimetype) {
    return (mimetype in this._typeToExtensionMap);
  },

  isSupportedExtension: function(extension) {
    return (extension in this._extensionToTypeMap);
  },

  isFilenameMatchesType: function(filename, mimetype) {
    var extension = this._parseExtension(filename);
    var guessedType = this.guessTypeFromExtension(extension);
    return (guessedType == mimetype);
  },

  guessExtensionFromType: function(mimetype) {
    return this._typeToExtensionMap[mimetype];
  },

  guessTypeFromExtension: function(extension) {
    return this._extensionToTypeMap[extension];
  },

  // If mimetype is not in the supported list, we will try to
  // predict the possible valid mimetype based on extension.
  guessTypeFromFileProperties: function(filename, mimetype) {
    var extension = this._parseExtension(filename);
    var type = this.isSupportedType(mimetype) ?
      mimetype : this.guessTypeFromExtension(extension);
    return type || '';
  },

  // if mimetype is not supported, preserve the original extension
  // and add the predict result as new extension.
  // If both filename and mimetype are not supported, return the original
  // filename.
  ensureFilenameMatchesType: function(filename, mimetype) {
    if (!this.isFilenameMatchesType(filename, mimetype)) {
      var guessedExt = this.guessExtensionFromType(mimetype);
      if (guessedExt) {
        filename += '.' + guessedExt;
      }
    }
    return filename;
  }
};
});

define('pop3/pop3',['module', 'exports', 'rdcommon/log', 'net', 'crypto',
        './transport', 'mailparser/mailparser', '../mailapi/imap/imapchew',
        '../mailapi/syncbase',
        './mime_mapper', '../mailapi/allback'],
function(module, exports, log, net, crypto,
         transport, mailparser, imapchew,
         syncbase, mimeMapper, allback) {

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

  function md5(s) {
    return crypto.createHash('md5').update(s).digest('hex').toLowerCase();
  }

  // Allow setTimeout and clearTimeout to be shimmed for unit tests.
  var setTimeout = window.setTimeout.bind(window);
  var clearTimeout = window.clearTimeout.bind(window);
  exports.setTimeoutFuncs = function(set, clear) {
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

    this._LOG = options._logParent ?
      LOGFAB.Pop3Client(this, options._logParent, Date.now() % 1000) : null;

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
    this.socket = net.connect(options.port, options.host,
                              options.crypto === 'ssl');

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

    if (options.debug) {
      this.attachDebugLogging();
    }

    // Hook the protocol and socket together:
    this.socket.on('data', this.protocol.onreceive.bind(this.protocol));
    this.protocol.onsend = this.socket.write.bind(this.socket);

    this.socket.on('connect', function() {
      if (connectTimeout) {
        clearTimeout(connectTimeout);
        connectTimeout = null;
      }
      this.state = 'greeting';
      // No further processing is needed here. We wait for the server
      // to send a +OK greeting before we try to authenticate.
    }.bind(this));

    this.socket.on('error', function(err) {
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
    }.bind(this));

    this.socket.on('close', function() {
      this.protocol.onclose();
      this.die();
    }.bind(this));

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
  Pop3Client.prototype.disconnect =
  Pop3Client.prototype.die = function() {
    if (this.state !== 'disconnected') {
      this.state = 'disconnected';
      this.socket.end();
      // No need to do anything further; we'll tear down when we
      // receive the socket's "close" event.
    }
  }

  /**
   * Attach a console logger that prints out any socket data sent or
   * received, blurring out authentication credentials. This is
   * automatically attached if {'debug': true} is passed as an option
   * to the constructor.
   */
  Pop3Client.prototype.attachDebugLogging = function() {
    // This isn't perfectly accurate; lines can split over packet/recv
    // boundaries, but it should be good enough for debug logging.
    // Because we always send a full command with the `.write()`
    // function, though, the outgoing data (thus credential hiding)
    // will always work.
    this.socket.on('data', function(data) {
      var s = bufferToPrintable(data);
      var color = (s.indexOf('-ERR') === -1 ? '\x1b[32m' : '\x1b[31m');
      dump('<-- ' + color + s + '\x1b[0;37m\n');
    });
    var oldWrite = this.socket.write;
    this.socket.write = function(data) {
      var s = bufferToPrintable(data);
      s = s.replace(/(AUTH|USER|PASS|APOP)(.*?)\\r\\n/g,
                    '$1 ***CREDENTIALS HIDDEN***\\r\\n');
      dump('--> ' + '\x1b[0;33m' + s + '\x1b[0;37m\n');
      return oldWrite.apply(this, arguments);
    }.bind(this.socket);
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
        secret = md5(apopTimestamp + pass);
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
              request: err.request,
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
      this.disconnect();
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

      // Download all of the messages in batches.
      var nextBatch = function() {
        console.log('POP3: Next batch. Messages left: ' + messages.length);
        // If there are no more messages, we're done.
        if (!messages.length) {
          console.log('POP3: Sync complete. ' +
                      totalMessages + ' messages synced, ' +
                      overflowMessages.length + ' overflow messages.');
          cb && cb(null, totalMessages, overflowMessages);
          return;
        }

        var batch = messages.splice(0, checkpointInterval);
        var latch = allback.latch();

        // Trigger a download for every message in the batch.
        batch.forEach(function(m, idx) {
          var messageDone = latch.defer();
          this.downloadPartialMessageByNumber(m.number, function(err, msg) {
            bytesFetched += m.size;
            progressCb && progressCb({
              totalBytes: totalBytes,
              bytesFetched: bytesFetched,
              size: m.size,
              message: msg
            });
            messageDone(err);
          });
        }.bind(this));

        // When all messages in this batch have completed, trigger the
        // next batch to begin download. If `checkpoint` is provided,
        // we'll wait for it to tell us to continue (so that we can
        // save the database periodically or perform other
        // housekeeping during sync).
        latch.then(function(results) {
          console.log('POP3: Checkpoint.');
          if (checkpoint) {
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
   * Convert a MailParser-intermediate MIME tree to a structure
   * format as parsable with imapchew. This allows us to reuse much of
   * the parsing code and maintain parity between IMAP and POP3.
   */
  function mimeTreeToStructure(node, partId, partMap, partialNode) {
    var structure = [];
    var contentType = node.meta.contentType.split('/');
    var typeInfo = {};
    typeInfo.type = contentType[0];
    typeInfo.subtype = contentType[1];
    typeInfo.params = {};
    typeInfo.params.boundary = node.meta.mimeBoundary || null;
    typeInfo.params.format = node.meta.textFormat || null;
    typeInfo.params.charset = node.meta.charset || null;
    typeInfo.params.name = node.meta.fileName || null;
    if (node.meta.contentDisposition) {
      typeInfo.disposition = {
        type: node.meta.contentDisposition,
        params: {},
      };
      if (node.meta.fileName) {
        typeInfo.disposition.params.filename = node.meta.fileName;
      }
    }
    typeInfo.partID = partId || '1';
    typeInfo.id = node.meta.contentId;
    typeInfo.encoding = 'binary'; // we already decoded it
    typeInfo.size = node.content && node.content.length || 0;
    typeInfo.description = null; // unsupported (unnecessary)
    typeInfo.lines = null; // unsupported (unnecessary)
    typeInfo.md5 = null; // unsupported (unnecessary)

    // XXX: see ActiveSync Folder._updateBody. Unit tests get angry if
    // there's a trailing newline in a body part.
    if (node.content != null) {
      if (typeInfo.type === 'text' &&
          node.content.length &&
          node.content[node.content.length - 1] === '\n') {
        node.content = node.content.slice(0, -1);
        typeInfo.size--;
      }
      partMap[typeInfo.partID] = node.content;
      // If this node was only partially downloaded, note it as such
      // in a special key on partMap. We'll use this key to later
      // indicate that this part's size should be calculated based on
      // the bytes we have not downloaded yet.
      if (partialNode === node) {
        partMap['partial'] = typeInfo.partID;
      }
    }

    structure.push(typeInfo);
    if (node.childNodes.length) {
      for (var i = 0; i < node.childNodes.length; i++) {
        var child = node.childNodes[i];
        structure.push(mimeTreeToStructure(
          child, typeInfo.partID + '.' + (i + 1), partMap, partialNode));
      }
    }
    return structure;
  }

  // This function is made visible for test logic external to this module.
  Pop3Client.parseMime = function(content) {
    return Pop3Client.prototype.parseMime.call(this, content);
  }

  Pop3Client.prototype.parseMime = function(mimeContent, isSnippet, number) {
    var mp = new mailparser.MailParser();
    mp._write(mimeContent);
    mp._process(true);
    var rootNode = mp.mimeTree;
    var partialNode = (isSnippet ? mp._currentNode : null);
    var estSize = number && this.idToSize[number] || mimeContent.length;
    var content;

    var partMap = {}; // partId -> content
    var msg = {
      id: number && this.idToUidl[number], // the server-given ID
      msg: rootNode,
      date: rootNode.meta.date && rootNode.meta.date.valueOf(),
      flags: [],
      structure: mimeTreeToStructure(rootNode, '1', partMap, partialNode),
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
      content = partMap[bodyRep.part];
      if (content != null) {
        var req = {
          // If bytes is null, imapchew.updateMessageWithFetch knows
          // that we've fetched the entire thing. Passing in [-1, -1] as a
          // range tells imapchew that we're not done downloading it yet.
          bytes: (partialPartKey === bodyRep.part ? [-1, -1] : null),
          bodyRepIndex: i,
          createSnippet: i === bodyRepIdx,
        };
        bodyRep.size = partSizes[bodyRep.part];
        var res = {bytesFetched: content.length, text: content};
        imapchew.updateMessageWithFetch(
          rep.header, rep.bodyInfo, req, res, this._LOG);
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
        (rootNode.parsedHeaders['x-ms-has-attach'] ||
         rootNode.meta.mimeMultipart === 'mixed' ||
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

var LOGFAB = exports.LOGFAB = log.register(module, {
  Pop3Client: {
    type: log.CONNECTION,
    subtype: log.CLIENT,
    events: {
    },
    TEST_ONLY_events: {
    },
    errors: {
      htmlParseError: { ex: log.EXCEPTION },
      htmlSnippetError: { ex: log.EXCEPTION },
      textChewError: { ex: log.EXCEPTION },
      textSnippetError: { ex: log.EXCEPTION },
    },
    asyncJobs: {
    },
  },
}); // end LOGFAB

Pop3Client._LOG = LOGFAB.Pop3Client();

}); // end define
;
define('mailapi/pop3/probe',['pop3/pop3', 'exports'], function(pop3, exports) {

/**
 * How many milliseconds should we wait before giving up on the
 * connection? (see imap/probe.js for extended rationale on this
 * number)
 */
exports.CONNECT_TIMEOUT_MS = 30000;

/**
 * Validate connection information for an account and verify that the
 * server on the other end is something we are capable of sustaining
 * an account with.
 *
 * If we succeed at logging in, hand off the established connection to
 * our caller so they can reuse the connection.
 */
function Pop3Prober(credentials, connInfo, _LOG) {
  var opts = {
    host: connInfo.hostname,
    port: connInfo.port,
    crypto: connInfo.crypto,

    username: credentials.username,
    password: credentials.password,

    connTimeout: exports.CONNECT_TIMEOUT_MS,
  };
  if (_LOG) {
    opts._logParent = _LOG;
  }
  console.log("PROBE:POP3 attempting to connect to", connInfo.hostname);

  var bail = this.onError.bind(this);
  var succeed = this.onLoggedIn.bind(this);

  // We need the server to support UIDL and TOP. To test that it does,
  // first we assume that there's a message in the mailbox. If so, we
  // can just run `UIDL 1` and `TOP 1` to see if it works. If there
  // aren't any messages, we'll just run `UIDL` by itself to see if
  // that works. If so, great. If it errors out in any other path, the
  // server doesn't have the support we need and we must give up.
  var conn = this._conn = new pop3.Pop3Client(opts, function(err) {
    if (err) { bail(err); return; }
    conn.protocol.sendRequest('UIDL', ['1'], false, function(err, rsp) {
      if (rsp) {
        conn.protocol.sendRequest('TOP', ['1', '0'], true, function(err, rsp) {
          if (rsp) {
            // both UIDL and TOP work. Awesome!
            succeed();
          } else if (err.err) {
            // Uh, this server must not support TOP. That sucks.
            bail({
              name: 'pop-server-not-great',
              message: 'The server does not support TOP, which is required.'
            });
          } else {
            // if the error was socket-level or something, let it pass
            // through untouched
            bail(rsp.err);
          }
        });
      } else {
        // Either their inbox is empty or they don't support UIDL.
        conn.protocol.sendRequest('UIDL', [], true, function(err, rsp) {
          if (rsp) {
            // It looks like they support UIDL, so let's go for it.
            succeed();
          } else if (err.err) {
            // They must not support UIDL. Not good enough.
            bail({
              name: 'pop-server-not-great',
              message: 'The server does not support UIDL, which is required.'
            });
          } else {
            // if the error was socket-level or something, let it pass
            // through untouched
            bail(rsp.err);
          }
        });
      }
    });
  });

  this.onresult = null;
  this.error = null;
  this.errorDetails = { server: connInfo.hostname };
}

exports.Pop3Prober = Pop3Prober;

Pop3Prober.prototype = {
  onLoggedIn: function() {
    var conn = this._conn;
    this._conn = null;

    console.log('PROBE:POP3 happy');
    if (this.onresult) {
      this.onresult(this.error, conn);
      this.onresult = false;
    }
  },

  onError: function(err) {
    err = analyzeError(err);
    console.warn('PROBE:POP3 sad.', err && err.name, '|',
                 err && err.message, '|',
                 err && err.response && err.response.getStatusLine());

    this.error = err.name;

    // we really want to make sure we clean up after this dude.
    try {
      this._conn.die();
    } catch (ex) {
    }
    var conn = this._conn;
    this._conn = null;

    if (this.onresult) {
      this.onresult(this.error, null, this.errorDetails);
      this.onresult = false;
    }
  },
};


// These strings were taken verbatim from failed Gmail POP connection logs:
var GMAIL_POP_DISABLED_RE = /\[SYS\/PERM\] Your account is not enabled for POP/;
var GMAIL_APP_PASS_RE = /\[AUTH\] Application-specific password required/;
var GMAIL_DOMAIN_DISABLED_RE =
      /\[SYS\/PERM\] POP access is disabled for your domain\./;

/**
 * Given an error returned from Pop3Client, analyze it for more
 * context-specific information such as if we should report the
 * problem to the user, if we should retry, etc.
 *
 * Notes on transient failures:
 *
 * LOGIN-DELAY: RFC2449 defines the LOGIN-DELAY capability to tell the
 * client how often it should check and introduces it as a response
 * code if the client checks too frequently. See
 * http://tools.ietf.org/html/rfc2449#section-8.1.1
 *
 * SYS: RFC3206 provides disambiguation between system failures and
 * auth failures. SYS/TEMP is something that should go away on its
 * own. SYS/PERM is for errors that probably require a human involved.
 * We aren't planning on actually telling the user what the SYS/PERM
 * problem was so they can contact tech support, so we lump them in
 * the same bucket. See http://tools.ietf.org/html/rfc3206#section-4
 *
 * IN-USE: Someone else is already in the maildrop, probably another
 * POP3 client. If optimizing for multiple POP3-using devices was
 * something we wanted to optimize for we would indicate a desire to
 * retry here with a more extensive back-off strategy. See
 * http://tools.ietf.org/html/rfc2449#section-8.1.2
 */
var analyzeError = exports.analyzeError = function(err) {
  // If the root cause was invalid credentials, we must
  // report the problem so the user can correct it.
  err.reportProblem = (err.name === 'bad-user-or-pass');
  // If the problem was due to bad credentials or bad server
  // security, retrying won't help. Otherwise, we can retry later,
  // for connection problems or intermittent server issues, etc.
  err.retry = (err.name !== 'bad-user-or-pass' &&
               err.name !== 'bad-security');
  // As long as we didn't time out, the server was reachable.
  err.reachable = (err.name !== 'timeout');

  // If the server provides a specific extended status label like
  // LOGIN-DELAY, SYS/PERM, etc., pull it into the status field for
  // debugging.
  if (err.message) {
    var match = /\[(.*?)\]/.exec(err.message);
    if (match) {
      err.status = match[1];
    }
  }

  // Style note: The Gmail if-statements below are a bit repetitive,
  // but leaving each one as an independent check makes it clear which
  // path the code flows through.

  // If the server is Gmail, we might be able to extract more
  // specific errors in the case of a failed login. We leave
  // reportProblem and retry as set above, since the actions needed
  // remain the same as bad-user-or-pass errors.
  if (err.name === 'bad-user-or-pass' &&
      err.message && GMAIL_POP_DISABLED_RE.test(err.message)) {
    err.name = 'pop3-disabled';
  } else if (err.name === 'bad-user-or-pass' &&
             err.message && GMAIL_APP_PASS_RE.test(err.message)) {
    err.name = 'needs-app-pass';
  } else if (err.name === 'bad-user-or-pass' &&
             err.message && GMAIL_DOMAIN_DISABLED_RE.test(err.message)) {
    err.name = 'pop3-disabled';
  } else if (err.name === 'unresponsive-server' && err.exception &&
      err.exception.name && /security/i.test(err.exception.name)) {
    // If there was a socket exception and the exception looks like
    // a security exception, note that it was a security-related
    // problem rather than just a bad server connection.
    err.name = 'bad-security';
  } else if ((err.name === 'unresponsive-server' ||
              err.name === 'bad-user-or-pass') &&
             err.message && /\[(LOGIN-DELAY|SYS|IN-USE)/i.test(err.message)) {
    // In two cases (bad auth, and unresponsive server), we might get
    // a more detailed status message from the server that saysa that
    // our account (or the entire server) is temporarily unavailble.
    // Per RFC 3206, these statuses indicate that the server is
    // unavailable right now but will be later.
    err.name = 'server-maintenance';
    err.status = err.message.split(' ')[0]; // set it to the first word
  }

  return err;
};



}); // end define
;