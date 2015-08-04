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
  isSupported: (typeof DataView !== 'undefined'),
  BUFFER_BYTE_LENGTH: 4,
  encode: function encodeFloat32Number(number, type) {
    type = type || 'arraybuffer';

    switch (type) {
      case 'arraybuffer':
        return this.encodeArrayBuffer(number);

      default:
        throw new Error('Unsupported encode to type.');
    }
  },
  encodeArrayBuffer: function Float32NumberToArrayBuffer(number) {
    if (typeof number !== 'number') {
      throw new Error('Argument received is not a number.');
    }

    var buf = new ArrayBuffer(4);
    new DataView(buf).setFloat32(0, number, true);

    return buf;
  },
  decode: function decodeFloat32Number(data) {
    switch (data.constructor) {
      case ArrayBuffer:
        return this.decodeArrayBuffer(data);

      default:
        throw new Error('Unsupported data type.');
    }
  },
  decodeArrayBuffer: function ArrayBufferToFloat32Number(buffer, byteOffset) {
    return (new DataView(buffer)).getFloat32(byteOffset, true);
  }
};

var JSZhuyinDataPackCollection = function(dataPacks) {
  this.dataPacks = dataPacks;

  if (!dataPacks.length) {
    throw new Error('JSZhuyinDataPackCollection: ' +
      'Expects an non-empty array.');
  }

  this.firstResultDataPack = null;
  this.results = [];
};
JSZhuyinDataPackCollection.prototype.getFirstResultScore = function() {
  if (this.results.length) {
    return this.results[0].score;
  }
  if (!this.firstResultDataPack) {
    this._getFirstResultDataPack();
  }

  return this.firstResultDataPack.getFirstResultScore();
};
JSZhuyinDataPackCollection.prototype.getFirstResult = function() {
  if (this.results.length) {
    return this.results[0];
  }
  if (!this.firstResultDataPack) {
    this._getFirstResultDataPack();
  }

  return {
    'str': this.firstResultDataPack.getFirstResult().str,
    'score': this.firstResultDataPack.getFirstResult().score,
    'symbols': this.firstResultDataPack.symbols
  };
};
JSZhuyinDataPackCollection.prototype._getFirstResultDataPack = function() {
  if (this.dataPacks.length === 1) {
    this.firstResultDataPack = this.dataPacks[0];

    return;
  }

  var score = -Infinity;
  this.dataPacks.forEach(function(dataPack, i) {
    if (dataPack.getFirstResultScore() > score) {
      this.firstResultDataPack = dataPack;
    }
  }.bind(this));
};
JSZhuyinDataPackCollection.prototype.getResults = function() {
  if (this.results.length) {
    return this.results;
  }

  if (this.dataPacks.length === 1) {
    this.results = this.dataPacks[0].getResults();
    this.results.forEach(function(res) {
      // XXX We are editing the res in-place
      res.symbols = this.dataPacks[0].symbols;
    }.bind(this));

    return this.results;
  }

  var results = [];

  // TODO: Optimize the sorting here.
  this.dataPacks.forEach(function(dataPack, i) {
    var resArr = dataPack.getResults();
    resArr.forEach(function(res) {
      var found = results.some(function(currentRes) {
        return (currentRes.str === res.str);
      });

      if (!found) {
        // XXX We are editing the res in-place
        res.symbols = dataPack.symbols;
        results.push(res);
      }
    });
  }.bind(this));

  results = results.sort(function(a, b) {
    return (b.score - a.score);
  });

  this.results = results;

  return results;
};

/**
 * JSZhuyinDataPack instance is the representation of the data in the database.
 * @param  {arraybuffer|array} imeData  arraybuffer the packed data, or an
 *                                      array of the structured data.
 * @constructor
 */
var JSZhuyinDataPack = function(imeData, byteOffset, length, symbols) {
  if (imeData.constructor === ArrayBuffer) {
    this.packed = imeData;
    this.byteOffset = byteOffset || 0;
    this.length = length || (imeData.byteLength >> 1);
    this.unpacked = undefined;
  } else if (Array.isArray(imeData)) {
    this.packed = undefined;
    this.unpacked = imeData;
  } else {
    this.packed = undefined;
    this.unpacked = undefined;
  }

  this.symbols = symbols;
};
/**
 * Get the score of the first item.
 * The arraybuffer will not be unpacked.
 * @return {number} Score.
 */
JSZhuyinDataPack.prototype.getFirstResultScore = function() {
  if (this.unpacked) {
    return this.unpacked[0].score;
  }

  return Float32Encoder.decodeArrayBuffer(this.packed, this.byteOffset + 2);
};
/**
 * Get the first item.
 * The arraybuffer will not be unpacked.
 * @return {object} The first item.
 */
JSZhuyinDataPack.prototype.getFirstResult = function() {
  if (this.unpacked) {
    return this.unpacked[0];
  }

  var view = new DataView(this.packed, this.byteOffset, this.length << 1);
  var controlByte = view.getUint16(0, true);
  var length = controlByte & 0x0f;

  var result = {
    'str': this._getStringFromDataView(view, 3 << 1, length),
    'score': this.getFirstResultScore()
  };

  return result;
};
/**
 * Get all items in an array. The arraybuffer will be unpacked automatically.
 * @return {array({str: string, score: number})} Results.
 */
JSZhuyinDataPack.prototype.getResults = function() {
  this.unpack();

  return this.unpacked;
};
/**
 * Get items in the packed result but only with the ones begins with
 * giving string.
 * @param  {string} str String to match.
 * @return {array({str: string, score: number})} Results.
 */
JSZhuyinDataPack.prototype.getResultsBeginsWith = function(str) {
  var filterFn = function(res) {
    return (res.str.substr(0, str.length) === str);
  };

  if (this.unpacked) {
    return this.unpacked.filter(filterFn);
  }

  return this._getPackedResults(filterFn);
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
  if (this.unpacked) {
    return;
  }

  if (typeof this.packed === 'undefined') {
    throw new Error('No packed IME data.');
  }

  this.unpacked = this._getPackedResults();
  this.packed = undefined;
};
/**
 * Go through the packed buffer and extract the results.
 * @param  {function} filterFn Test function for testing results. Optional.
 * @return {array({str: string, score: number})} Results.
 */
JSZhuyinDataPack.prototype._getPackedResults = function(filterFn) {
  var results = [];
  var view = new DataView(this.packed, this.byteOffset, this.length << 1);
  var controlByte = view.getUint16(0, true);
  var length = controlByte & 0x0f;

  var bytePos = 2;

  while (bytePos < view.byteLength) {
    // Ensure we'll not be getting out of range error.
    if ((bytePos + 4 + (length << 1)) > view.byteLength) {
      break;
    }

    var result = {
      'str': this._getStringFromDataView(view, bytePos + 4, length),
      'score': Float32Encoder.decodeArrayBuffer(
          this.packed, this.byteOffset + bytePos)
    };
    bytePos += (length + 2) << 1;

    if (typeof filterFn === 'function' && !filterFn(result)) {
      continue;
    }

    results.push(result);
  }

  return results;
};
/**
 * Pack the arraybuffer and remove the structured data object.
 */
JSZhuyinDataPack.prototype.pack = function() {
  if (this.packed) {
    return;
  }

  if (typeof this.unpacked === 'undefined') {
    throw new Error('No unpacked IME data.');
  }

  var length = 0;
  this.unpacked.forEach(function(result, i) {
    if (result.str.length > length) {
      length = result.str.length;
    }
    if (result.symbols && result.symbols.length > length) {
      length = result.symbols.length;
    }
  });

  if (length > 0xf) {
    throw new Error(
      'JSZhuyinDataPack: Longest string length is longer than expected.');
  }

  var arrayLength = 1 + (length + 2) * this.unpacked.length;

  var packedView = new DataView(new ArrayBuffer(arrayLength << 1));
  // 0x40 puts the control byte into printable characters region.
  packedView.setUint16(0, 0x40 ^ length, true);

  var bytePos = 1 << 1;
  this.unpacked.forEach(function(result, i) {
    packedView.setFloat32(bytePos, result.score, true);
    bytePos += (2 << 1);
    this._setStringToDataView(packedView, bytePos, result.str);
    bytePos += (length << 1);
  }, this);

  this.packed = packedView.buffer;
  this.byteOffset = 0;
  this.length = arrayLength;
};
/**
 * Overwrite the native toString() method.
 * @return {string} String representation of the JSZhuyinDataPack instance.
 */
JSZhuyinDataPack.prototype.toString = function() {
  if (this.unpacked) {
    return this.unpacked.toString();
  }

  if (this.packed) {
    return this.packed.toString();
  }

  return '[object JSZhuyinDataPack]';
};
/**
 * Get the string from given DataView instance.
 */
JSZhuyinDataPack.prototype._getStringFromDataView =
function(view, byteOffset, length) {
  var charCodes = [], charCode;
  for (var i = 0; i < length; i++) {
    charCode = view.getUint16(byteOffset + (i << 1), true);
    if (charCode) {
      charCodes.push(charCode);
    }
  }

  return String.fromCharCode.apply(String, charCodes);
};
/**
 * Set the string to given DataView instance.
 */
JSZhuyinDataPack.prototype._setStringToDataView =
function(view, byteOffset, str) {
  var i = 0;
  while (i < str.length) {
    view.setUint16(byteOffset + (i << 1), str.charCodeAt(i), true);
    i++;
  }
};

// Export as a CommonJS module if we are loaded as one.
if (typeof module === 'object' && module.exports) {
  module.exports = JSZhuyinDataPack;
}
