/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */
// vim:set ts=2 sw=2 sts=2 et ft=javascript:

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");

Components.utils.import("resource://fakeserver/modules/mimeParserHeaders.js");
Components.utils.import("resource://fakeserver/modules/mimeParserCore.js");

this.EXPORTED_SYMBOLS = ["MimeParser"];

// Emitter helpers, for internal functions later on.
var ExtractHeadersEmitter = {
  startPart: function (partNum, headers) {
    if (partNum == '' || partNum == '1$') {
      this.headers = headers;
    }
  }
};

var ExtractHeadersAndBodyEmitter = {
  body: '',
  startPart: ExtractHeadersEmitter.startPart,
  deliverPartData: function (partNum, data) {
    if (partNum == '')
      this.body += data;
  }
};

const Ci = Components.interfaces;
const Cc = Components.classes;

/// Sets appropriate default options for chrome-privileged environments
function setDefaultParserOptions(opts) {
  if (!("onerror" in opts)) {
    opts.onerror = Components.utils.reportError;
  }
}

var MimeParser = this.MimeParser = {
  /**
   * Triggers an asynchronous parse of the given input.
   *
   * The input is an input stream; the stream will be read until EOF and then
   * closed upon completion. Both blocking and nonblocking streams are
   * supported by this implementation, but it is still guaranteed that the first
   * callback will not happen before this method returns.
   *
   * @param input   An input stream of text to parse.
   * @param emitter The emitter to receive callbacks on.
   * @param opts    A set of options for the parser.
   */
  parseAsync: function MimeParser_parseAsync(input, emitter, opts) {
    // Normalize the input into an input stream.
    if (!(input instanceof Ci.nsIInputStream)) {
      throw new Error("input is not a recognizable type!");
    }

    // We need a pump for the listener
    var pump = Cc["@mozilla.org/network/input-stream-pump;1"]
                 .createInstance(Ci.nsIInputStreamPump);
    pump.init(input, -1, -1, 0, 0, true);

    // Make a stream listener with the given emitter and use it to read from
    // the pump.
    var parserListener = MimeParser.makeStreamListenerParser(emitter, opts);
    pump.asyncRead(parserListener, null);
  },

  /**
   * Triggers an synchronous parse of the given input.
   *
   * The input is a string that is immediately parsed, calling all functions on
   * the emitter before this function returns.
   *
   * @param input   A string or input stream of text to parse.
   * @param emitter The emitter to receive callbacks on.
   * @param opts    A set of options for the parser.
   */
  parseSync: function MimeParser_parseSync(input, emitter, opts) {
    // We only support string parsing if we are trying to do this parse
    // synchronously.
    if (typeof input != "string") {
      throw new Error("input is not a recognizable type!");
    }
    setDefaultParserOptions(opts);
    var parser = new Parser(emitter, opts);
    parser.deliverData(input);
    parser.deliverEOF();
    return;
  },

  /**
   * Returns a stream listener that feeds data into a parser.
   *
   * In addition to the functions on the emitter that the parser may use, the
   * generated stream listener will also make calls to onStartRequest and
   * onStopRequest on the emitter (if they exist).
   *
   * @param emitter The emitter to receive callbacks on.
   * @param opts    A set of options for the parser.
   */
  makeStreamListenerParser: function MimeParser_makeSLParser(emitter, opts) {
    var StreamListener = {
      onStartRequest: function SLP_onStartRequest(aRequest, aContext) {
        try {
          if ("onStartRequest" in emitter)
            emitter.onStartRequest(aRequest, aContext);
        } finally {
          this._parser.resetParser();
        }
      },
      onStopRequest: function SLP_onStopRequest(aRequest, aContext, aStatus) {
        this._parser.deliverEOF();
        if ("onStopRequest" in emitter)
          emitter.onStopRequest(aRequest, aContext, aStatus);
      },
      onDataAvailable: function SLP_onData(aRequest, aContext, aStream,
                                           aOffset, aCount) {
        var scriptIn = Cc["@mozilla.org/scriptableinputstream;1"]
                         .createInstance(Ci.nsIScriptableInputStream);
        scriptIn.init(aStream);
        // Use readBytes instead of read to handle embedded NULs properly.
        this._parser.deliverData(scriptIn.readBytes(aCount));
      },
      QueryInterface: XPCOMUtils.generateQI([Ci.nsIStreamListener,
        Ci.nsIRequestObserver])
    };
    setDefaultParserOptions(opts);
    StreamListener._parser = new Parser(emitter, opts);
    return StreamListener;
  },

  /**
   * Returns a new raw MIME parser.
   *
   * Prefer one of the other methods where possible, since the input here must
   * be driven manually.
   *
   * @param emitter The emitter to receive callbacks on.
   * @param opts    A set of options for the parser.
   */
  makeParser: function MimeParser_makeParser(emitter, opts) {
    setDefaultParserOptions(opts);
    return new Parser(emitter, opts);
  },

  /**
   * Returns a dictionary of headers for the given input.
   *
   * The input is any type of input that would be accepted by parseSync. What
   * is returned is a JS object that represents the headers of the entire
   * envelope as would be received by startPart when partNum is the empty
   * string.
   *
   * @param input   A string of text to parse.
   */
  extractHeaders: function MimeParser_extractHeaders(input) {
    var emitter = Object.create(ExtractHeadersEmitter);
    MimeParser.parseSync(input, emitter, {pruneat: '', bodyformat: 'none'});
    return emitter.headers;
  },

  /**
   * Returns the headers and body for the given input message.
   *
   * The return value is an array whose first element is the dictionary of
   * headers (as would be returned by extractHeaders) and whose second element
   * is a binary string of the entire body of the message.
   *
   * @param input   A string of text to parse.
   */
  extractHeadersAndBody: function MimeParser_extractHeaders(input) {
    var emitter = Object.create(ExtractHeadersAndBodyEmitter);
    MimeParser.parseSync(input, emitter, {pruneat: '', bodyformat: 'raw'});
    return [emitter.headers, emitter.body];
  },

  // Parameters for parseHeaderField

  /**
   * Parse the header as if it were unstructured.
   *
   * This results in the same string if no other options are specified. If other
   * options are specified, this causes the string to be modified appropriately.
   */
  HEADER_UNSTRUCTURED:       0x00,
  /**
   * Parse the header as if it were in the form text; attr=val; attr=val.
   *
   * Such headers include Content-Type, Content-Disposition, and most other
   * headers used by MIME as opposed to messages.
   */
  HEADER_PARAMETER:          0x02,
  /**
   * Parse the header as if it were a sequence of mailboxes.
   */
  HEADER_ADDRESS:            0x03,

  /**
   * This decodes parameter values according to RFC 2231.
   *
   * This flag means nothing if HEADER_PARAMETER is not specified.
   */
  HEADER_OPTION_DECODE_2231: 0x10,
  /**
   * This decodes the inline encoded-words that are in RFC 2047.
   */
  HEADER_OPTION_DECODE_2047: 0x20,
  /**
   * This converts the header from a raw string to proper Unicode.
   */
  HEADER_OPTION_ALLOW_RAW:   0x40,

  /// Convenience for all three of the above.
  HEADER_OPTION_ALL_I18N:    0x70,

  /**
   * Parse a header field according to the specification given by flags.
   *
   * Permissible flags begin with one of the HEADER_* flags, which may be or'd
   * with any of the HEADER_OPTION_* flags to modify the result appropriately.
   *
   * If the option HEADER_OPTION_ALLOW_RAW is passed, the charset parameter, if
   * present, is the charset to fallback to if the header is not decodable as
   * UTF-8 text. If HEADER_OPTION_ALLOW_RAW is passed but the charset parameter
   * is not provided, then no fallback decoding will be done. If
   * HEADER_OPTION_ALLOW_RAW is not passed, then no attempt will be made to
   * convert charsets.
   *
   * @param text    The value of a MIME or message header to parse.
   * @param flags   A set of flags that controls interpretation of the header.
   * @param charset A default charset to assume if no information may be found.
   */
  parseHeaderField: function MimeParser_parseHeaderField(text, flags, charset) {
    // If we have a raw string, convert it to Unicode first
    if (flags & MimeParser.HEADER_OPTION_ALLOW_RAW)
      text = HeaderParser.convertHeaderToUnicode(text, charset);

    // The low 4 bits indicate the type of the header we are parsing. All of the
    // higher-order bits are flags.
    switch (flags & 0x0f) {
    case MimeParser.HEADER_PARAMETER:
      return HeaderParser.extractParameters(text,
        (flags & MimeParser.HEADER_OPTION_DECODE_2047) != 0,
        (flags & MimeParser.HEADER_OPTION_DECODE_2231) != 0);
    case MimeParser.HEADER_UNSTRUCTURED:
      if (flags & MimeParser.HEADER_OPTION_DECODE_2047)
        text = HeaderParser.decode2047Words(text);
      return text;
    case MimeParser.HEADER_ADDRESS:
      return HeaderParser.extractAddresses(text,
        (flags & MimeParser.HEADER_OPTION_DECODE_2047) != 0);
    default:
      throw "Illegal type of header field";
    }
  },
};
