'use strict';

// This implements a packer/unpacker of the arraybuffer we get from storage.
// We would like to keep structured data in the JS world as few as possible to
// conserve memory and GC time.

/**
 * Float32Encoder encodes a given float number to an arraybuffer,
 * and vise versa.
 * @type {Object}
 */
var Float32Encoder = {
  isSupported: (function() {
    // In iOS, typeof Float32Array returns 'object' even though
    // it is indeed a valid constructor.
    try {
      new Float32Array([0]);
    } catch (e) {
      return false;
    }
    return true;
  })(),
  BUFFER_BYTE_LENGTH: Float32Array.BYTES_PER_ELEMENT || 4,
  encode: function encodeFloat32Number(number, type) {
    type = type || 'arraybuffer';

    switch (type) {
      case 'arraybuffer':
        return this.encodeArrayBuffer(number);

      default:
        throw 'Unsupported encode to type.';
    }
  },
  encodeArrayBuffer: function Float32NumberToArrayBuffer(number) {
    if (typeof number !== 'number')
      throw 'Float32Encoder.encode(): Argument received is not a number.';

    return (new Float32Array([number])).buffer;
  },
  decode: function decodeFloat32Number(data) {
    switch (data.constructor) {
      case ArrayBuffer:
        return this.decodeArrayBuffer(data);

      default:
        throw 'Unsupported data type.';
    }
  },
  decodeArrayBuffer: function ArrayBufferToFloat32Number(buffer, byteOffset) {
    return (new Float32Array(buffer, byteOffset, 1))[0];
  }
};

/**
 * JSZhuyinDataPack instance is the representation of the data in the database.
 * @param  {arraybuffer|array} imeData  arraybuffer the packed data, or an
 *                                      array of the structured data.
 * @constructor
 */
var JSZhuyinDataPack = function(imeData, byteOffset, length) {
  if (imeData.constructor === ArrayBuffer) {
    this.packed = imeData;
    this.byteOffset = byteOffset || 0;
    this.length = length ||
      imeData.byteLength / (Uint16Array.BYTES_PER_ELEMENT || 2);
    this.unpacked = undefined;
  } else if (Array.isArray(imeData)) {
    this.packed = undefined;
    this.unpacked = imeData;
  } else {
    this.packed = undefined;
    this.unpacked = undefined;
  }
};
/**
 * Get the score of the first item.
 * The arraybuffer will not be unpacked.
 * @return {number} Score.
 */
JSZhuyinDataPack.prototype.getFirstResultScore = function() {
  if (this.unpacked)
    return this.unpacked[0].score;

  return Float32Encoder.decodeArrayBuffer(this.packed, this.byteOffset);
};
/**
 * Get the first item.
 * The arraybuffer will not be unpacked.
 * @return {object} The first item.
 */
JSZhuyinDataPack.prototype.getFirstResult = function() {
  if (this.unpacked)
    return this.unpacked[0];

  var view = new Uint16Array(this.packed, this.byteOffset, this.length);
  var pad =
    Float32Encoder.BUFFER_BYTE_LENGTH / (Uint16Array.BYTES_PER_ELEMENT || 2);

  var ctl = view[pad];
  var symbols = !!(ctl & 0x20);
  var length = ctl & 0x0f;

  var result = {
    'str': String.fromCharCode.apply(String,
      view.subarray(pad + 1, pad + 1 + length)).replace('\u0000', ''),
    'score': this.getFirstResultScore()
  };

  if (symbols) {
    result['symbols'] = String.fromCharCode.apply(String,
        view.subarray(pad + 1 + length, pad + 1 + length * 2))
      .replace('\u0000', '');
  }

  return result;
};
/**
 * Get all items in an array. The arraybuffer will be unpacked automatically.
 * @return {array} The unpacked result.
 */
JSZhuyinDataPack.prototype.getResults = function() {
  this.unpack();

  return this.unpacked;
};
/**
 * Get the packed array buffer. The data will be packed automatically.
 * The byteLength is always dividable by 4.
 * @return {arraybuffer} The packed arraybuffer.
 */
JSZhuyinDataPack.prototype.getPacked = function() {
  this.pack();

  return this.packed;
};
/**
 * Unpack the arraybuffer and remove it.
 */
JSZhuyinDataPack.prototype.unpack = function() {
  if (this.unpacked)
    return;

  if (typeof this.packed === 'undefined')
    throw 'No packed IME data.';

  var unpacked = [];
  var view = new Uint16Array(this.packed, this.byteOffset, this.length);
  var pad =
    Float32Encoder.BUFFER_BYTE_LENGTH / (Uint16Array.BYTES_PER_ELEMENT || 2);

  var ctl = view[pad];
  var symbols = !!(ctl & 0x20);
  var length = ctl & 0x0f;

  unpacked.push(this.getFirstResult());

  var i = pad + 1 + length;
  if (symbols) i += length;

  while (i < view.length) {
    if (!view[i])
      break;

    var result = {
      'str': String.fromCharCode.apply(String,
        view.subarray(i, i + length)).replace('\u0000', '')
    };
    i += length;

    if (symbols) {
      result['symbols'] = String.fromCharCode.apply(String,
        view.subarray(i, i + length)).replace('\u0000', '');
      i += length;
    }

    unpacked.push(result);
  }

  this.unpacked = unpacked;
  this.packed = undefined;
};
/**
 * Pack the arraybuffer and remove the structured data object.
 */
JSZhuyinDataPack.prototype.pack = function() {
  if (this.packed)
    return;

  if (typeof this.unpacked === 'undefined')
    throw 'No unpacked IME data.';

  var length = 0;
  this.unpacked.forEach(function(result, i) {
    if (result['str'].length > length)
      length = result['str'].length;
  });

  if (length > 0xf)
    throw 'Longest string length is longer than expected.';

  var firstResult = this.getFirstResult();
  var symbols = !!(firstResult['symbols']);

  var pad =
    Float32Encoder.BUFFER_BYTE_LENGTH / (Uint16Array.BYTES_PER_ELEMENT || 2);
  var arrayLength = pad + 1 +
    (length + ((symbols) ? length : 0)) * this.unpacked.length;

  if (arrayLength % pad)
    arrayLength++;

  var packed = new Uint16Array(arrayLength);

  var scoreView =
    new Uint16Array(Float32Encoder.encodeArrayBuffer(firstResult['score']));
  for (var i = 0; i < pad; i++) {
    packed[i] = scoreView[i];
  }
  packed[pad] = 0x40 ^ (symbols ? 0x20 : 0) ^ length;

  var pos = pad + 1;
  this.unpacked.forEach(function(result, i) {
    var str = result['str'];
    for (var j = 0; j < length; j++) {
      if (str[j]) {
        packed[pos] = str.charCodeAt(j);
      }
      pos++;
    }

    if (symbols) {
      var sym = result['symbols'];
      for (var j = 0; j < length; j++) {
        if (sym[j]) {
          packed[pos] = sym.charCodeAt(j);
        }
        pos++;
      }
    }
  });
  this.packed = packed.buffer;
  this.byteOffset = 0;
  this.length = arrayLength;
};
/**
 * Overwrite the native toString() method.
 * @return {string} String representation of the JSZhuyinDataPack instance.
 */
JSZhuyinDataPack.prototype.toString = function() {
  if (this.unpacked)
    return this.unpacked.toString();

  if (this.packed)
    return this.packed.toString();

  return '[object JSZhuyinDataPack]';
};

// Export as a CommonJS module if we are loaded as one.
if (typeof module === 'object' && module['exports']) {
  module['exports'] = JSZhuyinDataPack;
}
