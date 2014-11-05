define(['mimefuncs', 'exports'], function(mimefuncs, exports) {

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

  function concatBuffers(a, b) {
    var buffer = new Uint8Array(a.length + b.length);
    buffer.set(a, 0);
    buffer.set(b, a.length);
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
        this.unprocessedLines.push(buffer.subarray(0, end + 1));
        buffer = this.buffer = buffer.subarray(end + 1);
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
          lines[i] = lines[i].subarray(1);
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
    return mimefuncs.fromTypedArray(this.lines[index]);
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
  Pop3Protocol.prototype.onreceive = function(evt) {
    this.parser.push(new Uint8Array(evt.data));

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
