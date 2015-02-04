/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */
////////////////////////////////////////////////////////////////////////////////
//                        JavaScript Raw MIME Parser                          //
////////////////////////////////////////////////////////////////////////////////

"use strict";

Components.utils.import("resource://fakeserver/modules/mimeParserHeaders.js");

this.EXPORTED_SYMBOLS = ["HeaderParser", "Parser"];

/**
 * The parser implemented in this file produces a MIME part tree for a given
 * input message via a streaming callback interface. It does not, by itself,
 * understand concepts like attachments (hence the term 'Raw'); the consumer
 * must translate output into such a format.
 *
 * Dependencies:
 * This file requires some external code for processing. The following are
 * things that are presumed to exist in the global scope:
 * function atob(str): Converts a JS string to a JS binary string
 * TextDecoder: An implementation of http://wiki.whatwg.org/wiki/StringEncoding
 *
 * Charsets:
 * The MIME specifications permit a single message to contain multiple charsets
 * (or perhaps none) as raw octets. As JavaScript strings are implicitly
 * implemented in UTF-16, it is possible that some engines will attempt to
 * convert these strings using an incorrect charset or simply fail to convert
 * them at all. This parser assumes that its input is in the form of a "binary
 * string", a string that uses only the first 256 characters of Unicode to
 * represent the individual octets. Even if this is the case, the data in the
 * strings are likely to be passed through unchanged no matter their charset
 * unless charset conversion happens on an 8-bit or binary string.
 *
 * The output charset is trickier. The parser only attempts to convert charsets
 * if the output format is "unicode". If the force option is set, then all parts
 * have their contents translated using the charset option (even if the content
 * type is not a text type). If it is not set, then the charset option is used
 * to determine the default charset for only text types (all other types are
 * translated as binary strings). If the charset option is a function, then that
 * function may be used to sniff for a possible content-type before translation.
 * If it is an empty string, then no translation is performed for media types
 * without explicit charsets. In any case, no translation of the headers are
 * done--they are always in a binary string format.
 *
 * Part numbering:
 * Since the output is a streaming format, individual parts are identified by a
 * numbering scheme. The intent of the numbering scheme for parts is to comply
 * with the part numbers as dictated by RFC 3501 as much possible; however,
 * that scheme does have several edge cases which would, if strictly followed,
 * make it impossible to refer to certain parts of the message. In addition, we
 * wish to make it possible to refer to parts which are not discoverable in the
 * original MIME tree but are still viewable as parts. The part numbering
 * scheme is as follows:
 * - Individual sections of a multipart/* body are numbered in increasing order
 *   sequentially, starting from 1. Note that the prologue and the epilogue of
 *   a multipart/* body are not considered entities and are therefore not
 *   included in the part numbering scheme (there is no way to refer to them).
 * - The numbers of multipart/* parts are separated by `.' characters.
 * - The outermost message is referred to by use of the empty string.
 * --> The following segments are not accounted for by IMAP part numbering. <--
 * - The body of any message/rfc822 or similar part is distinguished from the
 *   message part as a whole by appending a `$' character. This does not apply
 *   to the outermost message/rfc822 envelope.
 */

/**
 * A MIME parser.
 *
 * The inputs to the constructor consist of a callback object which receives
 * information about the output data and an optional object containing the
 * settings for the parser.
 *
 * The first parameter, emitter, is an object which contains several callbacks.
 * Note that any and all of these methods are optional; the parser will not
 * crash if one is missing. The callbacks are as follows:
 *   startMessage()
 *      Called when the stream to be parsed has started delivering data. This
 *      will be called exactly once, before any other call.
 *   endMessage()
 *      Called after all data has been delivered and the message parsing has
 *      been completed. This will be called exactly once, after any other call.
 *   startPart(string partNum, object headers)
 *      Called after the headers for a body part (including the top-level
 *      message) have been parsed. The first parameter is the part number (see
 *      the discussion on part numbering). The second parameter is a JS Map
 *      object where the keys are lower-case header names and the values are
 *      arrays of strings of the header values with newlines stripped. In
 *      addition, the headers object also contains a property rawHeaderText
 *      whose value is the text of all MIME headers, with whitespace and case
 *      perfectly preserved.
 *   endPart(string partNum)
 *      Called after all of the data for a body part (including sub-parts) has
 *      been parsed. The first parameter is the part number.
 *   deliverPartData(string partNum, {string,typedarray} data)
 *      Called when some data for a body part has been delivered. The first
 *      parameter is the part number. The second parameter is the data which is
 *      being delivered; the exact type of this data depends on the options
 *      used. Note that data is only delivered for leaf body parts.
 *
 *  The second parameter, options, is an optional object containing the options
 *  for the parser. The following are the options that the parser may use:
 *    pruneat: <string> [default=""]
 *      Treat the message as starting at the given part number, so that no parts
 *      above <string> are returned.
 *    bodyformat: one of {none, raw, nodecode, decode} [default=nodecode]
 *      How to return the bodies of parts:
 *        none: no part data is returned
 *        raw: the body of the part is passed through raw
 *        nodecode: the body is passed through without decoding QP/Base64
 *        decode: quoted-printable and base64 are fully decoded
 *    strformat: one of {binarystring, unicode, typedarray} [default=binarystring]
 *      How to treat output strings:
 *        binarystring: Data is a JS string with chars in the range [\x00-\xff]
 *        unicode: Data is a JS string with all parts with explicit charset data
 *          converted to UTF-16. See above note on charsets for more details.
 *        typedarray: Data is a JS typed array buffer
 *    charset: <string> [default=""]
 *      What charset to assume if no charset information is explicitly provided.
 *      This only matters if strformat is unicode. See above note on charsets
 *      for more details.
 *    force-charset: <boolean> [default=false]
 *      If true, this coerces all types to use the charset option, even if the
 *      message specifies a different content-type.
 *    stripcontinuations: <boolean> [default=true]
 *      If true, then the newlines in headers are removed in the returned
 *      header objects.
 *    onerror: <function(thrown error)> [default = nop-function]
 *      An error function that is called if an emitter callback throws an error.
 *      By default, such errors are swallowed by the parser. If you want the
 *      parser itself to throw an error, rethrow it via the onerror function.
 */
function Parser(emitter, options) {
  /// The actual emitter
  this._emitter = emitter;
  /// Options for the parser (those listed here are defaults)
  this._options = {
    pruneat: "",
    bodyformat: "nodecode",
    stripcontinuations: true,
    strformat: "binarystring",
    charset: "",
    "force-charset": false,
    onerror: function swallow(error) {}
  };
  // Load the options as a copy here (prevents people from changing on the fly).
  if (options)
    for (var opt in options) {
      this._options[opt] = options[opt];
    }

  // Ensure that the error function is in fact a function
  if (typeof this._options.onerror != "function")
    throw new Exception("onerror callback must be a function");

  // Reset the parser
  this.resetParser();
}
this.Parser = Parser;

/// Resets the parser to read a new message.
Parser.prototype.resetParser = function Parser_resetParser() {
  /// Current parser state
  this._state = PARSING_HEADERS;
  /// Input data that needs to be held for buffer conditioning
  this._holdData = '';
  /// Complete collection of headers (also used to accumulate _headerData)
  this._headerData = '';
  /// Whether or not emitter.startMessage has been called
  this._triggeredCall = false;

  /// Splitting input
  this._splitRegex = this._handleSplit = undefined;
  /// Subparsing
  this._subparser = this._subPartNum = undefined;
  /// Data that has yet to be consumed by _convertData
  this._savedBuffer = '';
  /// Convert data
  this._convertData = undefined;
  /// String decoder
  this._decoder = undefined;
}

/**
 * Deliver a buffer of data to the parser.
 */
Parser.prototype.deliverData = function Parser_deliverData(buffer) {
  // In ideal circumstances, we'd like to parse the message all at once. In
  // reality, though, data will be coming to us in packets. To keep the amount
  // of saved state low, we want to make basic guarantees about how packets get
  // delivered. Our basic model is a twist on line-buffering, as the format of
  // MIME and messages make it hard to not do so: we can handle multiple lines
  // at once. To ensure this, we start by conditioning the packet by
  // withholding data to make sure that the internal deliveries have the
  // guarantees. This implies that we need to do the following steps:
  // 1. We don't know if a `\r' comes from `\r\n' or the old mac line ending
  // until we see the next character. So withhold the last `\r'.
  // 2. Ensure that every packet ends on a newline. So scan for the end of the
  // line and withhold until the \r\n comes through.
  // [Note that this means that an input message that uses \r line endings and
  // is being passed to us via a line-buffered input is going to have most of
  // its data being withhold until the next buffer. Since \r is so uncommon of
  // a line ending in modern times, this is acceptable lossage.]
  // 3. Eliminate empty packets.

  // Add in previously saved data
  if (this._holdData) {
    buffer = this._holdData + buffer;
    this._holdData = '';
  }

  // Condition the input, so that we get the multiline-buffering mentioned in
  // the above comment.
  if (buffer.length > 0) {
    [buffer, this._holdData] = conditionToEndOnCRLF(buffer);
  }

  // Ignore 0-length buffers.
  if (buffer.length == 0)
    return;

  // Signal the beginning, if we haven't done so.
  if (!this._triggeredCall) {
    this._callEmitter("startMessage");
    this._triggeredCall = true;
  }

  // Finally, send it the internal parser.
  this._dispatchData("", buffer, true);
}

/// This function returns [string that ends in CRLF, rest of string]
function conditionToEndOnCRLF(buffer) {
  // Find the last occurrence of '\r' or '\n' to split the string. However, we
  // don't want to consider '\r' if it is the very last character, as we need
  // the next packet to tell if the '\r' is the beginning of a CRLF or a line
  // ending by itself.
  let lastCR = buffer.lastIndexOf('\r', buffer.length - 2);
  let lastLF = buffer.lastIndexOf('\n');
  let end = lastLF > lastCR ? lastLF : lastCR;
  return [buffer.substring(0, end + 1), buffer.substring(end + 1)];
}

/**
 * Tell the parser that all of the data has been delivered.
 *
 * This will flush all of the internal state of the parser.
 */
Parser.prototype.deliverEOF = function Parser_deliverEOF() {
  // Start of input buffered too long? Call start message now.
  if (!this._triggeredCall) {
    this._triggeredCall = true;
    this._callEmitter("startMessage");
  }
  // Force a flush of all of the data.
  if (this._holdData)
    this._dispatchData("", this._holdData, true);
  this._dispatchEOF("");
  // Signal to the emitter that we're done.
  this._callEmitter("endMessage");
}

/**
 * Calls a method on the emitter safely.
 *
 * This method ensures that errors in the emitter call won't cause the parser
 * to exit with an error, unless the user wants it to.
 */
Parser.prototype._callEmitter = function Parser_callEmitter(funcname) {
  if (this._emitter && funcname in this._emitter) {
    let args = Array.prototype.splice.call(arguments, 1);
    if (args.length > 0 && this._willIgnorePart(args[0])) {
      // partNum is always the first argument, so check to make sure that it
      // satisfies our emitter's pruneat requirement.
      return;
    }
    try {
      this._emitter[funcname].apply(this._emitter, args);
    } catch (e) {
      // We ensure that the onerror attribute in options is a function, so this
      // is always safe.
      this._options.onerror(e);
    }
  }
}

/**
 * Helper function to decide if a part's output will never be seen.
 */
Parser.prototype._willIgnorePart = function Parser_willIgnorePart(part) {
  if (this._options["pruneat"]) {
    let match = this._options["pruneat"];
    let start = part.substr(0, match.length);
    // It needs to start with and follow with a new part indicator
    // (i.e., don't let 10 match with 1, but let 1.1 or 1$ do so)
    if (start != match || (match.length < part.length &&
          "$.".indexOf(part[match.length]) == -1))
      return true;
  }
  return false;
}

//////////////////////
// MIME parser core //
//////////////////////

// This MIME parser is a stateful parser; handling of the MIME tree is mostly
// done by creating new parsers and feeding data to them manually. In parallel
// to the externally-visible deliverData and deliverEOF, the two methods
// _dispatchData and _dispatchEOF are the internal counterparts that do the
// main work of moving data to where it needs to go; helper functions are used
// to handle translation.
//
// The overall flow of the parser is this. First, it buffers all of the data
// until the dual-CRLF pattern is noticed. Once that is found, it parses the
// entire header chunk at once. As a result of header parsing, the parser enters
// one of three modes for handling data, and uses a special regex to change
// modes and handle state changes. Specific details about the states the parser
// can be in are as follows:
//   PARSING_HEADERS: The input buffer is concatenated to the currently-received
//     text, which is then searched for the CRLFCRLF pattern. If found, the data
//     is split at this boundary; the first chunk is parsed using _parseHeaders,
//     and the second chunk will fall through to buffer processing. After
//     splitting, the headers are deliverd via the emitter, and _startBody is
//     called to set up state for the parser.
//   SEND_TO_BLACK_HOLE: All data in the input is ignored.
//   SEND_TO_EMITTER: All data is passed into the emitter, if it is desired.
//     Data can be optionally converted with this._convertData.
//   SEND_TO_SUBPARSER: All data is passed into the subparser's _dispatchData
//     method, using _subPartNum as the part number and _subparser as the object
//     to call. Data can be optionally converted first with this._convertData.
//
// Additional state modifications can be done using a regex in _splitRegex and
// the callback method this._handleSplit(partNum, regexResult). The _handleSplit
// callback is free to do any modification to the current parser, including
// modifying the _splitRegex value. Packet conditioning guarantees that every
// buffer string passed into _dispatchData will have started immediately after a
// newline character in the fully assembled message.
//
// The this._convertData method, if present, is expected to return an array of
// two values, [{typedarray, string} decoded_buffer, string unused_buffer], and
// has as its arguments (string buffer, bool moreToCome).
//
// The header parsing by itself does very little parsing, only parsing as if all
// headers were unstructured fields. Values are munged so that embedded newlines
// are stripped and the result is also trimmed. Headers themselves are
// canonicalized into lower-case.


// Parser states. See the large comment above.
const PARSING_HEADERS = 1;
const SEND_TO_BLACK_HOLE = 2;
const SEND_TO_EMITTER = 3;
const SEND_TO_SUBPARSER = 4;

/**
 * Main dispatch for incoming packet data.
 *
 * The incoming data needs to have been sanitized so that each packet begins on
 * a newline boundary. The part number for the current parser also needs to be
 * passed in. The checkSplit parameter controls whether or not the data in
 * buffer needs to be checked against _splitRegex; this is used internally for
 * the mechanics of splitting and should otherwise always be true.
 */
Parser.prototype._dispatchData = function Parser_dispatchData(partNum, buffer,
    checkSplit) {
  if (!partNum)
    partNum = '1$';
  // Are we parsing headers?
  if (this._state == PARSING_HEADERS) {
    this._headerData += buffer;
    // Find the end of the headers--either it's a CRLF at the beginning (in
    // which case we have no headers), or it's a pair of CRLFs.
    let result = /(?:^(?:\r\n|[\r\n]))|(\r\n|[\r\n])\1/.exec(this._headerData);
    if (result != null) {
      // If we found the end of headers, split the data at this point and send
      // the stuff after the double-CRLF into the later body parsing.
      let headers = this._headerData.substr(0, result.index);
      buffer = this._headerData.substring(result.index + result[0].length);
      this._headerData = headers;
      this._headers = this._parseHeaders();
      this._callEmitter("startPart", partNum, this._headers);
      this._startBody(partNum);
    } else {
      return;
    }
  }

  // We're in the middle of the body. Start by testing the split regex, to see
  // if there are many things that need to be done.
  if (checkSplit && this._splitRegex) {
    let splitResult = this._splitRegex.exec(buffer);
    if (splitResult) {
      // Pass the text before the split through the current state.
      let start = splitResult.index, len = splitResult[0].length;
      if (start > 0)
        this._dispatchData(partNum, buffer.substr(0, start), false);

      // Tell the handler that we've seen the split. Note that this can change
      // any method on `this'.
      this._handleSplit(partNum, splitResult);

      // Send the rest of the data to where it needs to go. There could be more
      // splits in the data, so watch out!
      buffer = buffer.substring(start + len);
      if (buffer.length > 0)
        this._dispatchData(partNum, buffer, true);
      return;
    }
  }

  // Where does the data go?
  if (this._state == SEND_TO_BLACK_HOLE) {
    // Don't send any data when going to the black hole.
    return;
  } else if (this._state == SEND_TO_EMITTER) {
    // Don't pass body data if the format is to be none
    let passData = this._options["bodyformat"] != "none";
    if (!passData || this._willIgnorePart(partNum))
      return;
    buffer = this._applyDataConversion(buffer, this._options["strformat"]);
    if (buffer.length > 0)
      this._callEmitter("deliverPartData", partNum, buffer);
  } else if (this._state == SEND_TO_SUBPARSER) {
    buffer = this._applyDataConversion(buffer, "binarystring");
    if (buffer.length > 0)
      this._subparser._dispatchData(this._subPartNum, buffer, true);
  }
}

/// Applies this._convertData(buffer, true) if necessary
Parser.prototype._applyDataConversion = function Parser_convertData(buf, type) {
  // If we need to convert data, do so.
  if (this._convertData) {
    // Prepend leftover data from the last conversion.
    buf = this._savedBuffer + buf;
    [buf, this._savedBuffer] = this._convertData(buf, true);
  }
  return this._coerceData(buf, type, true);
}

/// Coerces the buffer (a string or typedarray) into a given type
Parser.prototype._coerceData = function Parser_coerce(buffer, type, more) {
  if (typeof buffer == "string") {
    // string -> binarystring is a nop
    if (type == "binarystring")
      return buffer;
    // Either we're going to array or unicode. Both people need the array
    var typedarray = stringToTypedArray(buffer);
    // If it's unicode, do the coercion from the array
    // If its typedarray, just return the synthesized one
    return type == "unicode" ? this._coerceData(typedarray, "unicode", more)
                             : typedarray;
  } else if (type == "binarystring") {
    // Doing array -> binarystring; String.fromCharCode does this nicely
    return String.fromCharCode.apply(undefined, buffer);
  } else if (type == "unicode") {
    // Doing array-> unicode: Use the decoder set up earlier to convert
    return this._decoder.decode(buffer, {stream: more});
  }
}

/**
 * Signal that no more data will be dispatched to this parser.
 */
Parser.prototype._dispatchEOF = function Parser_dispatchEOF(partNum) {
  if (this._state == PARSING_HEADERS) {
    // Unexpected EOF in headers. Parse them now and call startPart/endPart
    this._headers = this._parseHeaders();
    this._callEmitter("startPart", partNum, this._headers);
  } else if (this._state == SEND_TO_SUBPARSER) {
    // Pass in any lingering data
    if (this._convertData && this._savedBuffer)
      this._subparser._dispatchData(this._subPartNum,
        this._convertData(this._savedBuffer, false)[0], true);
    this._subparser._dispatchEOF(this._subPartNum);
    // Clean up after ourselves
    this._subparser = null;
  } else if (this._convertData && this._savedBuffer) {
    // Convert lingering data
    let [buffer, ] = this._convertData(this._savedBuffer, false);
    buffer = this._coerceData(buffer, this._options["strformat"], false);
    if (buffer.length > 0)
      this._callEmitter("deliverPartData", partNum, buffer);
  }

  // We've reached EOF for this part; tell the emitter
  this._callEmitter("endPart", partNum);
}

/**
 * Produce a dictionary of all headers as if they were unstructured fields.
 */
Parser.prototype._parseHeaders = function Parser_parseHeaders() {
  // An individual header is terminated by a CRLF, except if the CRLF is
  // followed by a SP or TAB. Use negative lookahead to capture the latter case,
  // and don't capture the strings or else split results get nasty.
  let values = this._headerData.split(/(?:\r\n|\n)(?![ \t])|\r(?![ \t\n])/);

  // Ignore the first "header" if it begins with an mbox delimiter
  if (values.length > 0 && values[0].substring(0, 5) == "From ") {
    values.shift();
    // Elide the mbox delimiter from this._headerData
    if (values.length == 0)
      this._headerData = '';
    else
      this._headerData = this._headerData.substring(
        this._headerData.indexOf(values[0]));
  }

  let headers = new Map();
  for (let i = 0; i < values.length; i++) {
    // Look for a colon. If it's not present, this header line is malformed,
    // perhaps by premature EOF or similar. The value is null in this case.
    let colon = values[i].indexOf(":");
    if (colon >= 0) {
      var header = values[i].substring(0, colon);
      var val = values[i].substring(colon + 1).trim();
      if (this._options.stripcontinuations)
        val = val.replace(/[\r\n]/g, '');
    } else {
      var header = values[i];
      var val = null;
    }

    // Canonicalize the header in lower-case form.
    header = header.trim().toLowerCase();
    // Omit "empty" headers
    if (header == '')
      continue;

    // We keep an array of values for each header, since a given header may be
    // repeated multiple times.
    if (headers.has(header)) {
      headers.get(header).push(val);
    } else {
      headers.set(header, [val]);
    }
  }

  headers.rawHeaderText = this._headerData;
  return headers;
}

/**
 * Initialize the parser state for the body of this message.
 */
Parser.prototype._startBody = function Parser_startBody(partNum) {
  // Should the bodyformat be raw, we just want to pass through all data without
  // trying to interpret it.
  if (this._options["bodyformat"] == "raw" &&
      partNum == this._options["pruneat"]) {
    this._state = SEND_TO_EMITTER;
    return;
  }
  // What do we assume if there's no content-type?
  let defaultContentType = this._defaultContentType || 'text/plain';
  let contentType = this._extractHeader('content-type', defaultContentType);

  // The output depents on the content-type. Basic rule of thumb:
  // 1. Discrete media types (text, video, audio, image, application) are passed
  //    through with no alterations beyond Content-Transfer-Encoding unpacking.
  // 2. Everything with a media type of multipart is treated the same.
  // 3. Any message/* type that acts like a mail message (rfc822, news, global)
  //    is parsed as a header/body pair again. Most of the other message/* types
  //    have similar structures, but they don't have cascading child subparts,
  //    so it's better to pass their entire contents to the emitter and let the
  //    consumer deal with them.
  // 4. For untyped data, there needs to be no Content-Type header. This helps
  //    avoid false positives.
  if (contentType.mediatype == 'multipart') {
    // If there's no boundary type, everything will be part of the prologue of
    // the multipart message, so just feed everything into a black hole.
    if (!('param-boundary' in contentType)) {
      this._state = SEND_TO_BLACK_HOLE;
      return;
    }
    // The boundary of a multipart message needs to start with -- and be at the
    // beginning of the line. If -- is after the boundary, it represents the
    // terminator of the multipart. After the line, there may be only whitespace
    // and then the CRLF at the end. Since the CRLFs in here are necessary for
    // distinguishing the parts, they are not included in the subparts, so we
    // need to capture them in the regex as well to prevent them leaking out.
    this._splitRegex = new RegExp('(\r\n|[\r\n]|^)--' +
      contentType['param-boundary'].replace(/[\\^$*+?.()|{}[\]]/g, '\\$&') +
      '(--)?[ \t]*(?:\r\n|[\r\n]|$)');
    this._handleSplit = this._whenMultipart;
    this._subparser = new Parser(this._emitter, this._options);
    // multipart/digest defaults to message/rfc822 instead of text/plain
    if (contentType.subtype == "digest")
      this._subparser._defaultContentType = "message/rfc822";

    // All text before the first boundary and after the closing boundary are
    // supposed to be ignored ("must be ignored", according to RFC 2046 §5.1.1);
    // in accordance with these wishes, ensure they don't get passed to any
    // deliverPartData.
    this._state = SEND_TO_BLACK_HOLE;

    // Multipart MIME messages stipulate that the final CRLF before the boundary
    // delimiter is not matched. When the packet ends on a CRLF, we don't know
    // if the next text could be the boundary. Therefore, we need to withhold
    // the last line of text to be sure of what's going on. The _convertData is
    // how we do this, even though we're not really converting any data.
    this._convertData = function mpart_no_leak_crlf(buffer, more) {
      let splitPoint = buffer.length;
      if (more) {
        if (buffer.charAt(splitPoint - 1) == '\n')
          splitPoint--;
        if (splitPoint >= 0 && buffer.charAt(splitPoint - 1) == '\r')
          splitPoint--;
      }
      let [preLF, rest] = conditionToEndOnCRLF(buffer.substring(0, splitPoint));
      return [preLF, rest + buffer.substring(splitPoint)];
    }
  } else if (contentType.type == 'message/rfc822' ||
      contentType.type == 'message/global' ||
      contentType.type == 'message/news') {
    // The subpart is just another header/body pair that goes to EOF, so just
    // return the parse from that blob
    this._state = SEND_TO_SUBPARSER;
    this._subPartNum = partNum + "$";
    this._subparser = new Parser(this._emitter, this._options);

    // So, RFC 6532 happily allows message/global types to have CTE applied.
    // This means that subparts would need to be decoded to determine their
    // contents properly. There seems to be some evidence that message/rfc822
    // that is illegally-encoded exists in the wild, so be lenient and decode
    // for any message/* type that gets here.
    let cte = this._extractHeader('content-transfer-encoding', '');
    if (cte in ContentDecoders)
      this._convertData = ContentDecoders[cte];
  } else {
    // Okay, we just have to feed the data into the output
    this._state = SEND_TO_EMITTER;
    if (this._options["bodyformat"] == "decode") {
      // If we wish to decode, look it up in one of our decoders.
      let cte = this._extractHeader('content-transfer-encoding', '');
      if (cte in ContentDecoders)
        this._convertData = ContentDecoders[cte];
    }
  }

  // Set up the encoder for charset conversions; only do this for text parts.
  // Other parts are almost certainly binary, so no translation should be
  // applied to them.
  if (this._options["strformat"] == "unicode" &&
      contentType.mediatype == "text") {
    var charset = "";
    // Forced charset
    if (this._options["force-charset"])
      charset = this._options["charset"];
    // ... If not forced, try the Content-Type
    else if ("param-charset" in contentType)
      charset = contentType["param-charset"];
    // ... otherwise, use the default
    else
      charset = this._options["charset"];


    // If the charset is nonempty, initialize the decoder
    if (charset !== "") {
      this._decoder = new TextDecoder(charset);
    } else {
      // There's no charset we can use for decoding, so pass through as an
      // identity encoder or otherwise this._coerceData will complain.
      this._decoder = {
        decode: function identity_decoder(buffer) {
          return Parser.prototype._coerceData(buffer, "binarystring", true);
        }
      };
    }
  }
}

// Internal split handling for multipart messages.
Parser.prototype._whenMultipart = function Parser_mpart(partNum, lastResult) {
  // Fix up the part number (don't do '' -> '.4' and don't do '1' -> '14')
  if (partNum != "") partNum += ".";
  if (!this._subPartNum) {
    // No count? This means that this is the first time we've seen the boundary,
    // so do some initialization for later here.
    this._count = 1;
  } else {
    // If we did not match a CRLF at the beginning of the line, strip CRLF from
    // the saved buffer. We do this in the else block because it is not
    // necessary for the prologue, since that gets ignored anyways.
    if (this._savedBuffer != '' && lastResult[1] === '') {
      let useEnd = this._savedBuffer.length - 1;
      if (this._savedBuffer[useEnd] == '\n')
        useEnd--;
      if (useEnd >= 0 && this._savedBuffer[useEnd] == '\r')
        useEnd--;
      this._savedBuffer = this._savedBuffer.substring(0, useEnd + 1);
    }
    // If we have saved data and we matched a CRLF, pass the saved data in.
    if (this._savedBuffer != '')
      this._subparser._dispatchData(this._subPartNum, this._savedBuffer, true);
    // We've seen the boundary at least once before, so this must end a subpart.
    // Tell that subpart that it has reached EOF.
    this._subparser._dispatchEOF(this._subPartNum);
  }
  this._savedBuffer = '';

  // The regex feeder has a capture on the (--)?, so if its result is present,
  // then we have seen the terminator. Alternatively, the message may have been
  // mangled to exclude the terminator, so also check if EOF has occurred.
  if (lastResult[2] == undefined) {
    this._subparser.resetParser();
    this._state = SEND_TO_SUBPARSER;
    this._subPartNum = partNum + this._count;
    this._count += 1;
  } else {
    // Ignore the epilogue
    this._splitRegex = null;
    this._state = SEND_TO_BLACK_HOLE;
  }
}

// Extract a header. This is for internal purposes.
// This calls the structured decoder if it exists. If it does not, it just trims
// the value and makes it lower case.
Parser.prototype._extractHeader = function Parser_extractHeader(name, dflt) {
  return extractHeader(this._headers, name, dflt);
}

// Buffer parsing functions, including both qp/base64 decoding and coercing to
// different datatypes.

function decode_qp(buffer, more) {
  // Unlike base64, quoted-printable isn't stateful across multiple lines, so
  // there is no need to buffer input, so we can always ignore more.
  let decoded = buffer.replace(
    // Replace either =<hex><hex> or =<wsp>CRLF
    /=([0-9A-F][0-9A-F]|[ \t]*(\r\n|[\r\n]|$))/gi,
    function replace_chars(match, param) {
      // If trailing text matches [ \t]*CRLF, drop everything, since it's a
      // soft line break.
      if (param.trim().length == 0)
        return '';
      return String.fromCharCode(parseInt(param, 16));
    });
  return [decoded, ''];
}
function decode_base64(buffer, more) {
  // Drop all non-base64 characters
  let sanitize = buffer.replace(/[^A-Za-z0-9+\/=]/g,'');
  // We need to encode in groups of 4 chars. If we don't have enough, leave the
  // excess for later. If there aren't any more, drop enough to make it 4.
  let excess = sanitize.length % 4;
  if (excess != 0 && more)
    buffer = sanitize.slice(-excess);
  else
    buffer = '';
  sanitize = sanitize.substring(0, sanitize.length - excess);
  // Use the atob function we (ought to) have in global scope.
  return [atob(sanitize), buffer];
}

var ContentDecoders = {};
ContentDecoders['quoted-printable'] = decode_qp;
ContentDecoders['base64'] = decode_base64;

/// Converts the input binary string to a Uint8Array buffer
function stringToTypedArray(buffer) {
  var typedarray = new Uint8Array(buffer.length);
  for (var i = 0; i < buffer.length; i++)
    typedarray[i] = buffer.charCodeAt(i);
  return typedarray;
}
