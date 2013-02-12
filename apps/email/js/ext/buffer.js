/**
 * Look like node's Buffer implementation as far as our current callers require
 * using typed arrays.  Derived from the node.js implementation as copied out of
 * the node-browserify project.
 *
 * Be careful about assuming the meaning of encoders and decoders here; we are
 * using the nomenclature of the StringEncoding spec.  So:
 *
 * - encode: JS String --> ArrayBufferView
 * - decode: ArrayBufferView ---> JS String
 **/
define('buffer',['require','exports','module'],function(require, exports, module) {

function coerce(length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length);
  return length < 0 ? 0 : length;
}

var ENCODER_OPTIONS = { fatal: false };

/**
 * Safe atob-variant that does not throw exceptions and just ignores characters
 * that it does not know about.  This is an attempt to mimic node's
 * implementation so that we can parse base64 with newlines present as well
 * as being tolerant of complete gibberish people throw at us.  Since we are
 * doing this by hand, we also take the opportunity to put the output directly
 * in a typed array.
 *
 * In contrast, window.atob() throws Exceptions for all kinds of angry reasons.
 */
function safeBase64DecodeToArray(s) {
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
 * Encode a unicode string into a (Uint8Array) byte array with the given
 * encoding. Wraps TextEncoder to provide hex and base64 "encoding" (which it
 * does not provide).
 */
function encode(string, encoding) {
  var buf, i;
  switch (encoding) {
    case 'base64':
      buf = safeBase64DecodeToArray(string);
      return buf;
    case 'binary':
      buf = new Uint8Array(string.length);
      for (i = 0; i < string.length; i++) {
        buf[i] = string.charCodeAt(i);
      }
      return buf;
    case 'hex':
      buf = new Uint8Array(string.length * 2);
      for (i = 0; i < string.length; i++) {
        var c = string.charCodeAt(i), nib;
        nib = c >> 4;
        buf[i*2] = (nib < 10) ? (nib + 48) : (nib - 10 + 97);
        nib = c & 0xf;
        buf[i*2 + 1] = (nib < 10) ? (nib + 48) : (nib - 10 + 97);
      }
      return buf;
    // need to normalize the name (for now at least)
    case 'utf8':
      encoding = 'utf-8';
    default:
      if (!encoding)
        encoding = 'utf-8';
      return TextEncoder(encoding, ENCODER_OPTIONS).encode(string);
  }
}

/**
 * Decode a Uint8Array/DataView into a unicode string given the encoding of the
 * byte stream.  Wrap TextDecoder to provide hex and base64 decoding (which it
 * does not provide).
 */
function decode(view, encoding) {
  var sbits, i;
  switch (encoding) {
    case 'base64':
      // base64 wants a string, so go through binary first...
    case 'binary':
      sbits = new Array(view.length);
      for (i = 0; i < view.length; i++) {
        sbits[i] = String.fromCharCode(view[i]);
      }
      // (btoa is binary JS string -> base64 ASCII string)
      if (encoding === 'base64')
        return window.btoa(sbits.join(''));
      return sbits.join('');
    case 'hex':
      sbits = new Array(view.length / 2);
      for (i = 0; i < view.length; i += 2) {
        var nib = view[i], c;
        if (nib <= 57)
          c = 16 * (nib - 48);
        else if (nib < 97)
          c = 16 * (nib - 64 + 10);
        else
          c = 16 * (nib - 97 + 10);
        nib = view[i+1];
        if (nib <= 57)
          c += (nib - 48);
        else if (nib < 97)
          c += (nib - 64 + 10);
        else
          c += (nib - 97 + 10);
        sbits.push(String.fromCharCode(c));
      }
      return sbits.join('');
    // need to normalize the name (for now at least)
    case 'utf8':
      encoding = 'utf-8';
    default:
      if (!encoding)
        encoding = 'utf-8';
      return TextDecoder(encoding, ENCODER_OPTIONS).decode(view);
  }
}

/**
 * Create a buffer which is really a typed array with some methods annotated
 * on.
 */
function Buffer(subject, encoding, offset) {
  // The actual buffer that will become 'this'.
  var buf;
  var type;

  // Are we slicing?
  if (typeof offset === 'number') {
    // create a sub-view
    buf = subject.subarray(offset, coerce(encoding) + offset);
  } else {
    // Find the length
    switch (type = typeof subject) {
      case 'number':
        buf = new Uint8Array(coerce(subject));
        break;

      case 'string':
        buf = encode(subject, encoding);
        break;

      case 'object': // Assume object is an array
        // only use it verbatim if it's a buffer and we see it as such (aka
        // it's from our compartment)
        if (buf instanceof Uint8Array)
          buf = subject;
        else
          buf = new Uint8Array(subject);
        break;

      default:
        throw new Error('First argument needs to be a number, ' +
                        'array or string.');
    }
  }

  // Return the mixed-in Uint8Array to be our 'this'!
  return buf;
}
exports.Buffer = Buffer;

Buffer.byteLength = function Buffer_byteLength(string, encoding) {
  var buf = encode(string, encoding);
  return buf.length;
};

Buffer.isBuffer = function Buffer_isBuffer(obj) {
  return ((obj instanceof Uint8Array) &&
          obj.copy === BufferPrototype.copy);
};

// POSSIBLY SUBTLE AND DANGEROUS THING: We are actually clobbering stuff onto
// the Uint8Array prototype.  We do this because we're not allowed to mix our
// contributions onto the instance types, leaving us only able to mess with
// the prototype.  This obviously may affect other consumers of Uint8Array
// operating in the same global-space.
var BufferPrototype = Uint8Array.prototype;

BufferPrototype.copy = function(target, target_start, start, end) {
  var source = this;
  start || (start = 0);
  end || (end = this.length);
  target_start || (target_start = 0);

  if (end < start) throw new Error('sourceEnd < sourceStart');

  // Copy 0 bytes; we're done
  if (end === start) return;
  if (target.length == 0 || source.length == 0) return;

  if (target_start < 0 || target_start >= target.length) {
    throw new Error('targetStart out of bounds');
  }

  if (start < 0 || start >= source.length) {
    throw new Error('sourceStart out of bounds');
  }

  if (end < 0 || end > source.length) {
    throw new Error('sourceEnd out of bounds');
  }

  // Are we oob?
  if (end > this.length) {
    end = this.length;
  }

  if (target.length - target_start < end - start) {
    end = target.length - target_start + start;
  }

  for (var i = start; i < end; i++) {
    target[i + target_start] = this[i];
  }
};

BufferPrototype.slice = function(start, end) {
  if (end === undefined) end = this.length;

  if (end > this.length) {
    throw new Error('oob');
  }
  if (start > end) {
    throw new Error('oob');
  }
  return Buffer(this, end - start, +start);
};

/**
 * Your buffer has some binary data in it; create a string from that data using
 * the specified encoding.  For example, toString("base64") will hex-encode
 * the contents of the buffer.
 */
BufferPrototype.toString = function(encoding, start, end) {
  encoding = String(encoding || 'utf-8').toLowerCase();
  start = +start || 0;
  if (typeof end == 'undefined') end = this.length;

  // Fastpath empty strings
  if (+end == start) {
    return '';
  }
  if (start === 0 && end === this.length)
    return decode(this, encoding);
  else
    return decode(this.subarray(start, end), encoding);
  // In case things get slow again, comment the above block and uncomment:
/*
var rval, before = Date.now();
  if (start === 0 && end === this.length)
    rval = decode(this, encoding);
  else
    rval = decode(this.subarray(start, end), encoding);
  var delta = Date.now() - before;
  if (delta > 2)
    console.error('SLOWDECODE', delta, end - start, encoding);
  return rval;
*/
};

BufferPrototype.write  = function(string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length;
      length = undefined;
    }
  } else {  // legacy
    var swap = encoding;
    encoding = offset;
    offset = length;
    length = swap;
  }

  offset = +offset || 0;
  var remaining = this.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = +length;
    if (length > remaining) {
      length = remaining;
    }
  }
  encoding = String(encoding || 'utf-8').toLowerCase();

  var encoded = encode(string, encoding);
  for (var i = 0; i < encoded.length; i++)
    this[i + offset] = encoded[i];

  return encoded.length;
};

});
