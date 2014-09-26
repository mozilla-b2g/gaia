define(function(require, exports, module) {

  /**
   * Safe atob-variant that does not throw exceptions and just ignores
   * characters that it does not know about. This is an attempt to
   * mimic node's implementation so that we can parse base64 with
   * newlines present as well as being tolerant of complete gibberish
   * people throw at us. Since we are doing this by hand, we also take
   * the opportunity to put the output directly in a typed array.
   *
   * In contrast, window.atob() throws Exceptions for all kinds of
   * angry reasons.
   */
  exports.decode = function(s) {
    var bitsSoFar = 0, validBits = 0, iOut = 0,
        arr = new Uint8Array(Math.ceil(s.length * 3 / 4));
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i), bits;
      if (c >= 65 && c <= 90) // [A-Z]
        bits = c - 65;
      else if (c >= 97 && c <= 122) // [a-z]
        bits = c - 97 + 26;
      else if (c >= 48 && c <= 57) // [0-9]
        bits = c - 48 + 52;
      else if (c === 43) // +
        bits = 62;
      else if (c === 47) // /
        bits = 63;
      else if (c === 61) { // =
        validBits = 0;
        continue;
      }
      // ignore all other characters!
      else
        continue;
      bitsSoFar = (bitsSoFar << 6) | bits;
      validBits += 6;
      if (validBits >= 8) {
        validBits -= 8;
        arr[iOut++] = bitsSoFar >> validBits;
        if (validBits === 2)
          bitsSoFar &= 0x3;
        else if (validBits === 4)
          bitsSoFar &= 0xf;
      }
    }

    if (iOut < arr.length)
      return arr.subarray(0, iOut);
    return arr;
  }

  /**
   * UInt8Array => base64 => UTF-8 String
   */
  exports.encode = function(view) {
    var sbits, i;
    sbits = new Array(view.length);
    for (i = 0; i < view.length; i++) {
      sbits[i] = String.fromCharCode(view[i]);
    }
    // (btoa is binary JS string -> base64 ASCII string)
    return window.btoa(sbits.join(''));
  }

  /**
   * Base64 binary data from a Uint8array to a Uint8Array the way an
   * RFC2822 MIME message likes it. Which is to say with a maximum of
   * 76 bytes of base64 encoded data followed by a \r\n. If the last
   * line has less than 76 bytes of encoded data we still put the \r\n
   * on.
   *
   * This method came into existence because we were blowing out our
   * memory limits which is how it justifies all this specialization.
   * Use window.btoa if you don't need this exact logic/help.
   */
  exports.mimeStyleBase64Encode = function(data) {
    var wholeLines = Math.floor(data.length / 57);
    var partialBytes = data.length - (wholeLines * 57);
    var encodedLength = wholeLines * 78;
    if (partialBytes) {
      // The padding bytes mean we're always a multiple of 4 long.  And then we
      // still want a CRLF as part of our encoding contract.
      encodedLength += Math.ceil(partialBytes / 3) * 4 + 2;
    }

    var encoded = new Uint8Array(encodedLength);

    // A nibble is 4 bits.
    function encode6Bits(nibbly) {
      // [0, 25] => ['A', 'Z'], 'A'.charCodeAt(0) === 65
      if (nibbly <= 25) {
        encoded[iWrite++] = 65 + nibbly;
      }
      // [26, 51] => ['a', 'z'], 'a'.charCodeAt(0) === 97
      else if (nibbly <= 51) {
        encoded[iWrite++] = 97 - 26 + nibbly;
      }
      // [52, 61] => ['0', '9'], '0'.charCodeAt(0) === 48
      else if (nibbly <= 61) {
        encoded[iWrite++] = 48 - 52 + nibbly;
      }
      // 62 is '+',  '+'.charCodeAt(0) === 43
      else if (nibbly === 62) {
        encoded[iWrite++] = 43;
      }
      // 63 is '/',  '/'.charCodeAt(0) === 47
      else {
        encoded[iWrite++] = 47;
      }
    }

    var iRead = 0, iWrite = 0, bytesToRead;
    // Steady state
    for (bytesToRead = data.length; bytesToRead >= 3; bytesToRead -= 3) {
      var b1 = data[iRead++], b2 = data[iRead++], b3 = data[iRead++];
      // U = Use, i = ignore
      // UUUUUUii
      encode6Bits(b1 >> 2);
      // iiiiiiUU UUUUiiii
      encode6Bits(((b1 & 0x3) << 4) | (b2 >> 4));
      //          iiiiUUUU UUiiiiii
      encode6Bits(((b2 & 0xf) << 2) | (b3 >> 6));
      //                   iiUUUUUU
      encode6Bits(b3 & 0x3f);

      // newlines; it's time to wrap every 57 bytes, or if it's our
      // last full set
      if ((iRead % 57) === 0 || bytesToRead === 3) {
        encoded[iWrite++] = 13; // \r
        encoded[iWrite++] = 10; // \n
      }
    }
    // Leftovers (could be zero). If we ended on a full set in the
    // prior loop, the newline is taken care of.
    switch(bytesToRead) {
    case 2:
      b1 = data[iRead++];
      b2 = data[iRead++];
      encode6Bits(b1 >> 2);
      encode6Bits(((b1 & 0x3) << 4) | (b2 >> 4));
      encode6Bits(((b2 & 0xf) << 2) | 0);
      encoded[iWrite++] = 61; // '='.charCodeAt(0) === 61
      encoded[iWrite++] = 13; // \r
      encoded[iWrite++] = 10; // \n
      break;
    case 1:
      b1 = data[iRead++];
      encode6Bits(b1 >> 2);
      encode6Bits(((b1 & 0x3) << 4) | 0);
      encoded[iWrite++] = 61; // '='.charCodeAt(0) === 61
      encoded[iWrite++] = 61;
      encoded[iWrite++] = 13; // \r
      encoded[iWrite++] = 10; // \n
      break;
    }

    // The code was used to help sanity check, but is inert.  Left in for
    // reviewers or those who suspect this code! :)
    /*
     if (iWrite !== encodedLength)
     throw new Error('Badly written code! iWrite: ' + iWrite +
     ' encoded length: ' + encodedLength);
     */

    return encoded;
  }

}); // end define
