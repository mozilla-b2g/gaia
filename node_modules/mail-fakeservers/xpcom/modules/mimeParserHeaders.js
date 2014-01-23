/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * This file implements the structured decoding of message header fields. It is
 * part of the same system as found in mimeParserCore.js, and occasionally makes
 * references to globals defined in that file or other dependencies thereof. See
 * documentation in that file for more information about external dependencies.
 */

"use strict";

/**
 * Tokenizes a message header into a stream of tokens as a generator.
 *
 * The low-level tokens are meant to be loosely correspond to the tokens as
 * defined in RFC 5322. For reasons of saner error handling, however, the two
 * definitions are not exactly equivalent. The tokens we emit are the following:
 * 1. Special delimiters: Any char in the delimiters string is emitted as a
 *    string by itself. Parsing parameter headers, for example, would use ";="
 *    for the delimiter strings.
 * 2. Quoted-strings (if opt.qstring is true): A string which is surrounded by
 *    double quotes. Escapes in the string are omitted when returning.
 * 3. Domain Literals (if opt.dliteral is true): A string which matches the
 *    dliteral construct in RFC 5322. Escapes here are NOT omitted.
 * 4. Comments (if opt.comments is true): Comments are handled specially. In
 *    practice, decoding the comments in To headers appears to be necessary, so
 *    comments are not stripped in the output value. Instead, they are emitted
 *    as if they are a special delimiter. However, all delimiters found within a
 *    comment are returned as if they were a quoted string, so that consumers
 *    ignore delimiters within comments. If ignoring comment text completely is
 *    desired, upon seeing a "(" token, consumers should ignore all tokens until
 *    a matching ")" is found (note that comments can be nested).
 * 5. RFC 2047 encoded-words (if opts.rfc2047 is true): These are strings which
 *    are the decoded contents of RFC 2047's =?UTF-8?Q?blah?=-style words.
 * 6. Atoms: Atoms are defined not in the RFC 5322 sense, but rather as the
 *    longest sequence of characters that is neither whitespace nor any of the
 *    special characters above.
 *
 * The intended interpretation of the stream of output tokens is that they are
 * the portions of text which can be safely wrapped in whitespace with no ill
 * effect. The output tokens are either strings or instances of a class that
 * customized .toString() for output; this is done to safely distinguish
 * between a single delimiter and a quoted-string that has a single delimiter
 * characer in it (e.g., ; versus ";"). Delimiters and atoms are always
 * returned as strings, everything else is returned as a quoted string.
 *
 * This method does not properly tokenize 5322 in all corner cases; however,
 * this is equivalent in those corner cases to an older header parsing
 * algorithm, so the algorithm should be correct for all real-world cases. The
 * corner cases are as follows:
 * 1. Quoted-strings and domain literals are parsed even if they are within a
 *    comment block (we effectively treat ctext as containing qstring).
 * 2. WSP need not be between a qstring and an atom (a"b" produces two tokens,
 *    a and b). This is an error case, though.
 * 3. "\" characters always escape the next character, even outside of quoted-
 *    strings, domain literals, and comments. However, outside of the first two
 *    contexts, they are not semantically invisible.
 *
 * @param value      The raw header value
 * @param delimiters A set of delimiters to include as individual tokens
 * @param opts       A set of options for what to parse, see above.
 */
function getHeaderTokens(value, delimiters, opts) {
  /// Represents a non-delimiter token
  function Token(token, unescape) {
    if (unescape)
      token = token.replace(/\\(.?)/g, "$1");
    this.token = token;
  }
  Token.prototype.toString = function () { return this.token; };

  let tokenStart = undefined;
  let wsp = " \t\r\n";
  let endQuote = undefined;
  let commentDepth = 0;
  let length = value.length;
  for (let i = 0; i < length; i++) {
    let ch = value[i];
    // If we see a \, no matter what context we are in, ignore the next
    // character.
    if (ch == '\\') {
      i++;
      continue;
    }

    // If we are in a qstring or a dliteral, process the character only if it is
    // what we are looking for to end the quote.
    if (endQuote !== undefined) {
      if (ch == endQuote && ch == '"') {
        let text = value.slice(tokenStart + 1, i);

        // If RFC 2047 is enabled, decode the qstring only if the entire string
        // appears to be a 2047 token. Don't unquote just yet (this will better
        // match people who incorrectly treat RFC 2047 decoding as a separate,
        // earlier step).
        if (opts.rfc2047 && text.startsWith("=?") && text.endsWith("?="))
          text = decode2047Words(text);

        yield new Token(text, true);
        endQuote = undefined;
        tokenStart = undefined;
      } else if (ch == endQuote && ch == ']') {
        yield new Token(value.slice(tokenStart, i + 1), true);
        endQuote = undefined;
        tokenStart = undefined;
      }
      continue;
    }

    // If we can match the RFC 2047 encoded word pattern, we need to decode the
    // entire word.
    if (opts.rfc2047 && ch == '=' && value[i + 1] == '?') {
      // RFC 2047 tokens separated only by whitespace are conceptually part of
      // the same output token, so we need to decode them all at once.
      let encodedWordsRE = /([ \t\r\n]*=\?[^?]*\?[BbQq]\?[^?]*\?=)+/;
      let result = encodedWordsRE.exec(value.slice(i));
      if (result !== null) {
        // Error handling: yield everybody we have through this point first.
        if (tokenStart !== undefined) {
          yield value.slice(tokenStart, i);
          tokenStart = undefined;
        }

        // Find out how much we need to decode...
        let encWordsLen = result[0].length;
        yield decode2047Words(value.slice(i, i + encWordsLen), "UTF-8");

        // Skip everything else...
        i += encWordsLen - 1;
        continue;
      }
    }

    let tokenIsEnding = false, tokenIsStarting = false, isSpecial = false;
    if (wsp.contains(ch))
      tokenIsEnding = true;
    else if (commentDepth == 0 && delimiters.contains(ch)) {
      tokenIsEnding = true;
      isSpecial = true;
    } else if (opts.qstring && ch == '"') {
      tokenIsEnding = true;
      tokenIsStarting = true;
      endQuote = ch;
    } else if (opts.dliteral && ch == '[') {
      tokenIsEnding = true;
      tokenIsStarting = true;
      endQuote = ']';
    } else if (opts.comments && ch == '(') {
      commentDepth++;
      tokenIsEnding = true;
      isSpecial = true;
    } else if (opts.comments && ch == ')') {
      if (commentDepth > 0)
        commentDepth--;
      tokenIsEnding = true;
      isSpecial = true;
    } else {
      tokenIsStarting = true;
    }

    if (tokenIsEnding && tokenStart !== undefined) {
      yield value.slice(tokenStart, i);
      tokenStart = undefined;
    }
    if (isSpecial)
      yield ch;
    if (tokenIsStarting && tokenStart === undefined) {
      tokenStart = i;
    }
  }
  if (tokenStart !== undefined) {
    if (endQuote == '"')
      yield new Token(value.slice(tokenStart + 1), true);
    else
      yield new Token(value.slice(tokenStart), false);
  }
}

/**
 * Convert a header value into UTF-16 strings by attempting to decode as UTF-8
 * or another legacy charset.
 */
function convertHeaderToUnicode(headerValue, fallbackCharset) {
  // Only attempt to convert the headerValue if it contains non-ASCII
  // characters.
  if (/[\x80-\xff]/.exec(headerValue)) {
    // First convert the value to a typed-arry for TextDecoder.
    let typedarray = stringToTypedArray(headerValue);

    // Don't try UTF-8 as fallback (redundant), and don't try UTF-16 or UTF-32
    // either, since they radically change header interpretation.
    // If we have a fallback charset, we want to know if decoding will fail;
    // otherwise, we want to replace with substitution chars.
    let hasFallback = fallbackCharset &&
                      !fallbackCharset.toLowerCase().startsWith("utf");
    let utf8Decoder = new TextDecoder("utf-8", {fatal: hasFallback});
    try {
      headerValue = utf8Decoder.decode(typedarray);
    } catch (e) {
      // Failed, try the fallback
      let decoder = new TextDecoder(fallbackCharset, {fatal: false});
      headerValue = decoder.decode(typedarray);
    }
  }
  return headerValue;
}

/**
 * Decodes all 2047 words in the input string.
 */
function decode2047Words(headerValue) {
  // Unfortunately, many implementations of RFC 2047 encoding are actually wrong
  // in that they split over-long encoded words without regard for whether or
  // not the split point is in the middle of a multibyte character. Therefore,
  // we need to be able to handle these situations gracefully. This is done by
  // using the decoder in streaming mode so long as the next token is another
  // 2047 token with the same charset.
  let lastCharset = '', currentDecoder = undefined;

  /// Decode a single RFC 2047 token.
  function decode2047Token(token) {
    let tokenParts = token.split("?");

    // If it's obviously not a valid token, return false immediately.
    if (tokenParts.length != 5 || tokenParts[4] != '=')
      return false;

    // The charset parameter is defined in RFC 2231 to be charset or
    // charset*language. We only care about the charset here, so ignore any
    // language parameter that gets passed in.
    let charset = tokenParts[1].split('*', 1)[0];
    let encoding = tokenParts[2], text = tokenParts[3];

    let buffer;
    if (encoding == 'B' || encoding == 'b') {
      // Decode base64. If there's any non-base64 data, treat the string as
      // an illegal token.
      if (/[^A-Za-z0-9+\/=]/.exec(text))
        return false;

      // Base64 strings must be a length of multiple 4, but it seems that some
      // mailers accidentally insert one too many `=' chars. Gracefully handle
      // this case; see bug 227290 for more information.
      if (text.length % 4 == 1 && text.charAt(text.length - 1) == '=')
        text = text.slice(0, -1);

      // Decode the string
      buffer = decode_base64(text, false)[0];
    } else if (encoding == 'Q' || encoding == 'q') {
      // Q encoding here looks a lot like quoted-printable text. The differences
      // between quoted-printable and this are that quoted-printable allows you
      // to quote newlines (this doesn't), while this replaces spaces with _.
      // We can reuse the decode_qp code here, since newlines are already
      // stripped from the header. There is one edge case that could trigger a
      // false positive, namely when you have a single = or an = followed by
      // whitespace at the end of the string. Such an input string is already
      // malformed to begin with, so stripping the = and following input in that
      // case should not be an important loss.
      buffer = decode_qp(text.replace('_', ' ', 'g'), false)[0];
    } else {
      return false;
    }

    // Make the buffer be a typed array for what follows
    buffer = stringToTypedArray(buffer);

    // If we cannot reuse the last decoder, flush out whatever remains.
    var output = '';
    if (charset != lastCharset && currentDecoder) {
      output += currentDecoder.decode();
      currentDecoder = null;
    }

    // Initialize the decoder for this token.
    lastCharset = charset;
    if (!currentDecoder) {
      try {
        currentDecoder = new TextDecoder(charset, {fatal: false});
      } catch (e) {
        // We don't recognize the charset, so give up.
        return false;
      }
    }

    // Convert this token with the buffer.
    return output + currentDecoder.decode(buffer, {stream: true});
  }

  // The first step of decoding is to split the string into RFC 2047 and
  // non-RFC 2047 tokens. RFC 2047 tokens look like the following:
  // =?charset?c?text?=, where c is one of B, b, Q, and q. The split regex does
  // some amount of semantic checking, so that malformed RFC 2047 tokens will
  // get ignored earlier.
  let components = headerValue.split(/(=\?[^?]*\?[BQbq]\?[^?]*\?=)/);
  for (let i = 0; i < components.length; i++) {
    if (components[i].substring(0, 2) == "=?") {
      let decoded = decode2047Token(components[i]);
      if (decoded !== false) {
        // If 2047 decoding succeeded for this bit, rewrite the original value
        // with the proper decoding.
        components[i] = decoded;

        // We're done processing, so continue to the next link.
        continue;
      }
    } else if (/^[ \t\r\n]*$/.exec(components[i])) {
      // Whitespace-only tokens get squashed into nothing, so 2047 tokens will
      // be concatenated together.
      components[i] = '';
      continue;
    }

    // If there was stuff left over from decoding the last 2047 token, flush it
    // out.
    lastCharset = '';
    if (currentDecoder) {
      components[i] = currentDecoder.decode() + components[i];
      currentDecoder = null;
    }
  }

  // After the for loop, we'll have a set of decoded strings. Concatenate them
  // together to make the return value.
  return components.join('');
}

///////////////////////////////
// Structured field decoders //
///////////////////////////////

// Structured decoders exist in two pieces. There are the basic methods, for
// decoding headers based on their type rather than full semantic decomposition.
// All of these methods take as their first parameter the string to be parsed.
// In addition to these, we have specific structurers for individual headers
// that are useful for the parser (e.g., Content-Type).

/**
 * Extract a list of addresses from a header which matches the RFC 5322
 * address-list production, possibly doing RFC 2047 decoding along the way.
 *
 * The output of this method is an array of elements corresponding to the
 * addresses and the groups in the input header. An address is represented by
 * an object of the form:
 * {
 *   name: The display name of the address
 *   email: The address of the object
 * }
 * while a group is repreented by an object of the form:
 * {
 *   name: The display name of the group
 *   members: An array of address object for members in the group.
 * }
 */
function extractAddresses(header, doRFC2047) {
  let results = [];
  // Temporary results
  let addrlist = [];

  // Build up all of the values
  var name = '', groupName = '', address = '';
  // Indicators of current state
  var inAngle = false, needsSpace = false;
  // Main parsing loop
  for (let token of getHeaderTokens(header, ":,;<>@",
        {qstring: true, comments: true, dliteral: true, rfc2047: doRFC2047})) {
    if (token === ':') {
      groupName = name;
      name = '';
      if (addrlist.length > 0)
        results = results.concat(addrlist);
      addrlist = [];
    } else if (token === '<') {
      inAngle = true;
    } else if (token === '>') {
      inAngle = false;
    } else if (token === '@') {
      if (!inAngle) {
        address = name;
        name = '';
      }
      // Keep the local-part quoted if it needs to be.
      if (/[ !()<>\[\]:;@\\,"]/.exec(address) !== null)
        address = '"' + address.replace(/([\\"])/g, "\\$1") + '"';
      address += '@';
    } else if (token === ',') {
      if (name !== '' || address !== '')
        addrlist.push({
          name: name,
          email: address
        });
      name = address = '';
    } else if (token === ';') {
      // Add pending name to the list
      if (name !== '' || address !== '')
        addrlist.push({name: name, email: address});

      results.push({
        name: groupName,
        members: addrlist
      });
      addrlist = [];
      groupName = name = address = '';
    } else {
      if (needsSpace && token !== ')')
        token = ' ' + token;

      if (inAngle || address !== '')
        address += token;
      else
        name += token;
      needsSpace = token !== '(' && token !== ' (';
      continue;
    }
    needsSpace = false;
  }
  if (name !== '' || address !== '')
    addrlist.push({name: name, email: address});
  if (groupName !== '') {
    results.push({name: groupName, members: addrlist});
    addrlist = [];
  }

  return results.concat(addrlist);
}

/**
 * Extract parameters from a header which is a series of ;-separated
 * attribute=value tokens.
 */
function extractParameters(headerValue, doRFC2047, doRFC2231) {
  // The basic syntax of headerValue is token [; token = token-or-qstring]*
  // Copying more or less liberally from nsMIMEHeaderParamImpl:
  // The first token is the text to the first whitespace or semicolon.
  var semi = headerValue.indexOf(";");
  if (semi < 0) {
    var start = headerValue;
    var rest = '';
  } else {
    var start = headerValue.substring(0, semi);
    var rest = headerValue.substring(semi); // Include the semicolon
  }
  // Strip start to be <WSP><nowsp><WSP>
  start = start.trim().split(/[ \t\r\n]/)[0];

  // Actually do the matching
  let opts = {qstring: true, rfc2047: doRFC2047};
  let name = '', inName = true;
  let matches = [];
  for (let token of getHeaderTokens(rest, ";=", opts)) {
    if (token === ';') {
      if (name != '' && inName == false)
        matches.push([name, '']);
      name = '';
      inName = true;
    } else if (token === '=') {
      inName = false;
    } else if (inName && name == '') {
      name = token.toString();
    } else if (!inName && name != '') {
      token = token.toString();
      // RFC 2231 doesn't make it clear if %-encoding is supposed to happen
      // within a quoted string, but this is very much required in practice. If
      // an * is found in the parameter name, then the content is being
      // generated by an RFC 2231-aware entity, so %-encoding is possibly being
      // used in the value.
      if (doRFC2231 && name.contains('*')) {
        token = token.replace(/%([0-9A-Fa-f]{2})/g,
          function percent_deencode(match, hexchars) {
            return String.fromCharCode(parseInt(hexchars, 16));
        });
      }
      matches.push([name, token]);
      name = '';
    } else if (inName) {
      name = ''; // Error recovery, ignore this one
    }
  }
  if (name != '' && inName == false)
    matches.push([name, '']);

  // Now matches holds the parameters, so clean up for RFC 2231. There are four
  // cases: param=val, param*=us-ascii'en-US'blah, and param*n= variants. The
  // order of preference is to pick the middle, then the last, then the first.

  // simpleValues is just a straight parameter -> value map.
  // charsetValues is the parameter -> value map, although values are stored
  // before charset decoding happens.
  // continuationValues maps parameter -> [valid, hasCharset, param*0, ...]
  var simpleValues = {}, charsetValues = {}, continuationValues = {};
  for (let [name, value] of matches) {
    let star = name.indexOf('*');
    if (star == -1) {
      // The first match of simple param=val wins.
      if (!(name in simpleValues))
        simpleValues[name] = value;
    } else if (star == name.length - 1) {
      // This is the case of param*=us-ascii'en-US'blah.
      name = name.substring(0, star);
      if (!(name in charsetValues))
        charsetValues[name] = value;
    } else {
      // String is like param*0= or param*0*=
      let param = name.substring(0, star);
      // Did we previously find this one to be bungled? Then ignore it.
      if (param in continuationValues && !continuationValues[param][0])
        continue;

      // If we haven't seen it yet, set up entry already. Note that entries are
      // not straight string values but rather [valid, hasCharset, param0, ... ]
      if (!(param in continuationValues))
        continuationValues[param] = [true, undefined];
      var entry = continuationValues[param];

      // When the string ends in *, we need to charset decoding.
      // Note that the star is only meaningful for the *0*= case.
      let lastStar = name[name.length - 1] == '*';
      let number = name.substring(star + 1, name.length - (lastStar ? 1 : 0));
      if (number == '0')
        entry[1] = lastStar;

      // Is the continuation number illegal?
      else if ((number[0] == '0' && number != '0') ||
          !(/^[0-9]+$/.test(number))) {
        entry[0] = false;
        continue;
      }
      // Normalize to an integer
      number = parseInt(number, 10);

      // Is this a repeat? If so, bail.
      if (entry[number + 2] !== undefined) {
        entry[0] = false;
        continue;
      }

      // Set the value for this continuation index. JS's magic array setter will
      // expand the array if necessary.
      entry[number + 2] = value;
    }
  }

  // Build the actual parameter array from the parsed values
  var values = {};
  // Simple values have lowest priority, so just add everything into the result
  // now.
  for (let name in simpleValues) {
    values[name] = simpleValues[name];
  }

  /// Converts a US-ASCII'en-US'var-style string to JS UTF-16.
  function decode2231Value(value) {
    let quote1 = value.indexOf("'");
    let quote2 = quote1 >= 0 ? value.indexOf("'", quote1 + 1) : -1;

    let charset = (quote1 >= 0 ? value.substring(0, quote1) : "");
    // It turns out that the language isn't useful anywhere in our codebase for
    // the present time, so we will safely ignore it.
    //var language = (quote2 >= 0 ? value.substring(quote1 + 2, quote2) : "");
    value = value.substring(Math.max(quote1, quote2) + 1);

    // Convert the value into a typed array for decoding
    let typedarray = stringToTypedArray(value);

    // Decode the charset. If the charset isn't found, we throw an error. Try to
    // fallback in that case.
    return new TextDecoder(charset, {fatal: true})
      .decode(typedarray, {stream: false});
  }

  // Continuation values come next
  for (let name in continuationValues) {
    var data = continuationValues[name];
    //if (data[0] == false) continue; // Invalid
    if (data[1] === undefined) continue; // Also invalid
    // Did we find all continuations?
    let valid = true;
    for (var i = 2; valid && i < data.length; i++)
      if (data[i] === undefined)
        valid = false;
    //if (!valid)
    //  continue;

    // Concatenate the parameters
    var value = data.slice(2, i).join('');
    if (doRFC2231 && data[1]) {
      try {
        value = decode2231Value(value);
      } catch (e) {
        // Bad charset, don't add anything.
        continue;
      }
    }
    // If we are leaving the value RFC2231-encoded, then have the name indicate
    // the presence of the encoding.  This is consistent with how IMAP servers
    // behave (and is really just being added for imapd.js.)
    else if (!doRFC2231 && data[1]) {
      name += '*';
    }

    values[name] = value;
  }

  // Highest priority is the charset conversion
  if (doRFC2231) {
    for (let name in charsetValues) {
      try {
        values[name] = decode2231Value(charsetValues[name]);
      } catch (e) {
        // Bad charset, don't add anything.
      }
    }
  }
  return [start, values];
}

////////////////////////////////////
// High-level structured decoders //
////////////////////////////////////

var StructuredDecoders = {};
StructuredDecoders['content-type'] = function structure_content_type(value) {
  let [type, params] = extractParameters(value);
  let parts = type.split('/');
  if (parts.length != 2) {
    // Malformed. Return to text/plain. Evil, ain't it?
    params = {};
    parts = ["text", "plain"];
  }
  let mediatype = parts[0].toLowerCase();
  let subtype = parts[1].toLowerCase();
  let type = mediatype + '/' + subtype;
  let structure = {
    'mediatype': mediatype,
    'subtype': subtype,
    'type': type,
  };
  for (let name in params) {
    structure['param-' + name.toLowerCase()] = params[name];
  }
  return structure;
};

/**
 * Extract the value of header from the header objects.
 *
 * If there is a structured decoder for this header, the structured decoder will
 * be called with the appropriate value. If not, then the value will be trimmed
 * and returned.
 */
function extractHeader(headers, name, dflt) {
  let value = headers.has(name) ? headers.get(name)[0] : dflt;
  if (name in StructuredDecoders)
    return StructuredDecoders[name](value);
  // In lieu of anything else, just return lower-case version
  return value.trim().toLowerCase();
}

// Gather up the header parsing things for easier export as symbols.
this.HeaderParser = Object.freeze({
  convertHeaderToUnicode: convertHeaderToUnicode,
  decode2047Words: decode2047Words,
  extractAddresses: extractAddresses,
  extractParameters: extractParameters
});
this.StructuredDecoders = StructuredDecoders;
this.extractHeader = extractHeader;

this.EXPORTED_SYMBOLS = ['HeaderParser', 'StructuredDecoders', 'extractHeader'];
