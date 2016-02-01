'use strict';

/* global JSZhuyinDataPack, JSZhuyinDataPackCollection, BopomofoEncoder */

// This file implemented BinStorage, an in-memory key-value storage (for now).
// Additional sugar is put onto JSZhuyinDataPackStorage to more effectively
// manage JSZhuyin-specific data.

/**
 * A simple key-value store wrapps with JavaScript object.
 * @this   {object}   CacheStore instance.
 */
var CacheStore = function CacheStore() {
  this.dataMap = new Map();
};
/**
 * set the value of a key.
 * @param  {array(number)} codes Key.
 * @param  {any}           value Value.
 * @this   {object}              CacheStore instance.
 */
CacheStore.prototype.add = function cs_add(codes, value) {
  // In the interest of not doing deep comparsion on arrays, we would convert
  // them to string here.
  this.dataMap.set(String.fromCharCode.apply(String, codes), value);
};
/**
 * get the value of a key.
 * @param  {array(number)} codes Key.
 * @return {any}                 Value of the key.
 * @this   {object}              CacheStore instance.
 */
CacheStore.prototype.get = function cs_get(codes) {
  return this.dataMap.get(String.fromCharCode.apply(String, codes));
};
/**
 * Clean up the store. Any key that is not a substring of the superset
 * string will have their value removed.
 *
 * @param  {array(number)} supersetCodes The superset code array.
 * @this   {object}                      CacheStore instance.
 */
CacheStore.prototype.cleanup = function cs_cleanup(supersetCodes) {
  if (!supersetCodes) {
    this.dataMap.clear();
    return;
  }

  var supersetStr = String.fromCharCode.apply(String, supersetCodes);

  this.dataMap.forEach(function(v, key) {
    if (supersetStr.indexOf(key) === -1) {
      this.dataMap.delete(key);
    }
  }, this);
};

/**
 * BinStorage rely on a big chunk of encoded ArrayBuffer to do the lookup.
 * @constructor
 */
var BinStorage = function BinStorage() {
  this.loaded = false;
  this._bin = undefined;
};
/**
 * Load the database.
 * @this {object} BinStorage instance.
 */
BinStorage.prototype.load = function bs_load(data) {
  if (this.loaded) {
    this.unload();
  }

  this.loaded = true;
  this._bin = data;
};
/**
 * Unoad the database.
 * @this {object} BinStorage instance.
 */
BinStorage.prototype.unload = function bs_unload() {
  this._bin = undefined;
  this.loaded = false;
};
/**
 * Get values from storage.
 * @param  {array(number)}       codes Array of numbers to query.
 * @return {arraybuffer}               the result.
 */
BinStorage.prototype.get = function bs_get(codes) {
  if (!this.loaded) {
    throw new Error('BinStorage: not loaded.');
  }

  var code;
  var byteOffset = 0;
  while ((code = codes.shift()) !== undefined) {
    byteOffset = this.searchBlock(code, byteOffset);
    if (byteOffset === -1) {
      return undefined;
    }
  }
  return this._getBlockContent(byteOffset);
};
/**
 * Look for all value begin with this key.
 * @param  {array(number)}       codes Array of numbers to query.
 * @return {array(array(...))}         Array of results of _getBlockContent
 */
BinStorage.prototype.getRange = function bs_getRange(codes) {
  if (!this.loaded) {
    throw new Error('BinStorage: not loaded.');
  }

  var code;
  var byteOffset = 0;
  while ((code = codes.shift()) !== undefined) {
    byteOffset = this.searchBlock(code, byteOffset);
    if (byteOffset === -1) {
      return [];
    }
  }

  return this.getRangeFromContentIndex(byteOffset);
};
/**
 * Get all of the values from this address.
 * @param  {numbber}  byteOffset  Byte offset of the block.
 * @return {array(array(...))}    Array of results of _getBlockContent
 */
BinStorage.prototype.getRangeFromContentIndex = function(byteOffset) {
  var bin = this._bin;
  var result = [];

  var getBlockContents = function bs_getBlockContents(byteOffset) {
    var view = new DataView(bin, byteOffset);
    var length = view.getUint16(0, true);
    var contentLength = view.getUint16(2, true);

    if (length === 0) {
      return;
    }

    var addressBlockByteOffset =
      byteOffset + ((2 + contentLength + length) << 1);

    var addressBlockView =
      new DataView(bin, addressBlockByteOffset, length << 2);

    var i = length;
    while (i--) {
      var blockAddress = addressBlockView.getUint32(i << 2, true);
      var content = this._getBlockContent(blockAddress);
      if (content) {
        result.push(content);
      }

      getBlockContents(blockAddress);
    }
  }.bind(this);

  getBlockContents(byteOffset);
  return result;
};
/**
 * Internal method for search a given block for a single character.
 * @param  {number}   code        code of the character.
 * @param  {numbber}  byteOffset  Byte offset of the block.
 * @return {number}   byteOffset of the block found, or -1.
 */
BinStorage.prototype.searchBlock = function bs_searchBlock(code, byteOffset) {
  var bin = this._bin;
  var view = new DataView(bin, byteOffset);
  var length = view.getUint16(0, true);
  var contentLength = view.getUint16(2, true);

  var keyBlockByteOffset =
    byteOffset + ((2 + contentLength) << 1);

  var addressBlockByteOffset =
    byteOffset + ((2 + contentLength + length) << 1);

  var keyBlockView = new DataView(bin, keyBlockByteOffset, length << 1);
  var addressBlockView = new DataView(bin, addressBlockByteOffset, length << 2);

  // Do a interpolation search
  var low = 0;
  var high = length - 1;
  var mid;

  var lowCode, highCode, midCode;

  while (low < length &&
        (lowCode = keyBlockView.getUint16(low << 1, true)) <= code &&
        (highCode = keyBlockView.getUint16(high << 1, true)) >= code) {
    mid = low + (((code - lowCode) * (high - low)) / (highCode - lowCode)) | 0;

    midCode = keyBlockView.getUint16(mid << 1, true);

    if (midCode < code) {
      low = mid + 1;
    } else if (midCode > code) {
      high = mid - 1;
    } else {
      return addressBlockView.getUint32(mid << 2, true);
    }
  }

  if (lowCode === code) {
    return addressBlockView.getUint32(low << 2, true);
  } else {
    return -1;
  }
};
/**
 * Internal method for getting the content of the block.
 * @param  {numbber}  byteOffset  Byte offset of the block.
 * @return {array} array contain 4 elements
 *   - First element is the reference to the arrayBuffer
 *   - Second element is the byteOffset the content begins.
 *   - Third element is the length of the content.
 *   - Forth element is the address of the block.
 */
BinStorage.prototype._getBlockContent =
  function bs_getBlockContent(byteOffset) {
    var bin = this._bin;
    var view = new DataView(bin, byteOffset);
    var contentLength = view.getUint16(2, true);

    if (contentLength === 0) {
      return undefined;
    }

    return [bin, byteOffset + (2 << 1), contentLength, byteOffset];
  };

var JSZhuyinDataPackStorage = function() {
  this.incompleteMatchedCache = new CacheStore();
  this.getCache = new CacheStore();
  this._interchangeablePairs = '';
  this._interchangeablePairsArr = new Uint16Array(0);
};
JSZhuyinDataPackStorage.prototype = Object.create(BinStorage.prototype);
/**
 * When searching for matching words/phrases, consider these pairs of symbols
 * are interchangables.
 * Must be a string representing 2n sounds in Bopomofo symbols.
 *
 * Example string: 'ㄣㄥㄌㄖㄨㄛㄡ', making ㄣ interchangable with ㄥ and
 * ㄌ interchangable with ㄖ, and ㄨㄛ with ㄡ.
 *
 * @param {string} str String representing the pairs.
 */
JSZhuyinDataPackStorage.prototype.setInterchangeablePairs = function(str) {
  if (str === this._interchangeablePairs) {
    return;
  }

  // String has changed, invalidate the entire cache.
  this.incompleteMatchedCache.cleanup();

  var encodedSounds = BopomofoEncoder.encode(str);

  if (encodedSounds.length % 2) {
    throw new Error('JSZhuyinDataPackStorage: Expects string to store pairs.');
  }

  var arr = new Uint16Array(encodedSounds);

  this._interchangeablePairs = str;
  this._interchangeablePairsArr = arr;
};
/**
 * Get values from storage, disregards interchangeable pairs.
 * @param  {array(number)}       codes Array of numbers to query.
 * @return {JSZhuyinData}              The resulting JSZhuyinData instance.
 */
JSZhuyinDataPackStorage.prototype.get = function(codes) {
  // Should be null or the previous instance.
  if (typeof this.getCache.get(codes) === 'object') {
    return this.getCache.get(codes);
  }

  var result = BinStorage.prototype.get.call(this, codes);

  if (result) {
    // This is equal to |new JSZhuyinDataPack(..)| but take array of arugments
    var dataPack = Object.create(JSZhuyinDataPack.prototype);
    JSZhuyinDataPack.apply(dataPack, result);

    this.getCache.add(codes, dataPack);
    return dataPack;
  } else {
    this.getCache.add(codes, null);
    return null;
  }
};
/**
 * Look for all value begin from this block address.
 * @param  {numbber}  byteOffset          Byte offset of the block.
 * @return {array(JSZhuyinData)}          The resulting JSZhuyinData instances.
 */
JSZhuyinDataPackStorage.prototype.getRangeFromContentIndex = function() {
  return BinStorage.prototype.getRangeFromContentIndex.apply(this, arguments)
    .map(function(result) {
      var dataPack = Object.create(JSZhuyinDataPack.prototype);
      JSZhuyinDataPack.apply(dataPack, result);
      return dataPack;
    });
};
/**
 * Return all results that matches to given partial encoded Bopomofo string.
 * @param  {array(number)}              codes     string to query.
 * @return {JSZhuyinDataPackCollection?}
 *                                       A JSZhuyinDataPackCollection instance
 *                                       representing the results.
 */
JSZhuyinDataPackStorage.prototype.getIncompleteMatched = function(codes) {
  if (!this.loaded) {
    throw new Error('JSZhuyinDataPackStorage: not loaded.');
  }

  // Should be null or the previous instance.
  if (typeof this.incompleteMatchedCache.get(codes) === 'object') {
    return this.incompleteMatchedCache.get(codes);
  }

  // addresses is the reduced result of checking the codes in sequences,
  // start by looking at matched keys at table 0.
  var addresses = codes
    .reduce(function(addresses, code) {
      // Thie reduces to the every addresses that matches to the code, starting
      // from empty array.
      // Return back the reduced result and replaces the previous array of
      // addresses.
      return addresses.reduce(function(codeAddresses, address) {
        // If the code represents a completed sound, we should
        // use searchBlock() instead of doing linear workathough with
        // _getIncompleteMatchedCodesInBlock() since there can be only
        // one match.
        var a;
        if (!this._interchangeablePairs &&
            BopomofoEncoder.isCompleted(code)) {
          a = this.searchBlock(code, address);
          if (a !== -1) {
            return codeAddresses.concat(a);
          }

          return codeAddresses;
        }

        // Depend on the setting, the result should be matched either by
        // trying to split the encoded sound into multiple encoded sounds,
        // or not.
        var results =
          this._getIncompleteMatchedSingleCodesInBlock(code, address);

        // Matched addresses are appended into the current list.
        return codeAddresses.concat(results);
      }.bind(this), /* codeAddresses */ []);
    }.bind(this), /* addresses */ [0]);

  // DataPacks are constructed by getting the content of these addresses,
  // remove the null results, and construct with the content argument array.
  var dataPacks = addresses
    .map(function(address) {
      return this._getBlockContent(address);
    }, this)
    .filter(function(result) {
      return !!result;
    })
    .map(function(result) {
      var dataPack = Object.create(JSZhuyinDataPack.prototype);
      JSZhuyinDataPack.apply(dataPack, result);
      return dataPack;
    });

  if (!dataPacks.length) {
    this.incompleteMatchedCache.add(codes, null);

    return null;
  }

  var dataPackCollection = new JSZhuyinDataPackCollection(dataPacks);
  this.incompleteMatchedCache.add(codes, dataPackCollection);

  return dataPackCollection;
};
/**
 * Internal method to get all the addresses point from a given block that
 * matches the code with BopomofoEncoder.isIncompletionOf().
 * @param  {number}   code            code of the character.
 * @param  {numbber}  byteOffset      Byte offset of the block.
 * @return {array(number)}            Array of byte offsets
 */
JSZhuyinDataPackStorage.prototype._getIncompleteMatchedSingleCodesInBlock =
function jdps__getIncompleteMatchedSingleCodesInBlock(code, byteOffset) {
  var bin = this._bin;
  var view = new DataView(bin, byteOffset);
  var length = view.getUint16(0, true);
  var contentLength = view.getUint16(2, true);

  var keyBlockByteOffset =
    byteOffset + ((2 + contentLength) << 1);

  var addressBlockByteOffset =
    byteOffset + ((2 + contentLength + length) << 1);

  var keyBlockView = new DataView(bin, keyBlockByteOffset, length << 1);
  var addressBlockView = new DataView(bin, addressBlockByteOffset, length << 2);

  code = this._replaceInterchangeableSymbols(code);

  var addresses = [], c;
  for (var i = 0; i < length; i++) {
    c = this._replaceInterchangeableSymbols(
      keyBlockView.getUint16(i << 1, true));
    if (BopomofoEncoder.isIncompletionOf(code, c)) {
      addresses.push(addressBlockView.getUint32(i << 2, true));
    }
  }

  return addresses;
};
/**
 * Attempt to find the sounds for a set of characters.
 * Only search for the 0th block (one-sound entries), does not consider
 * word-phrases.
 * Very very slow operation.
 * @param  {String} str Characters to search
 * @return {String}     Encoded sounds of Bopomofo. \u0000 for sounds can't be
 *                      found.
 */
JSZhuyinDataPackStorage.prototype.reverseGet = function(str) {
  // Construct an buffer of the same length and filled with zero.
  var res = [];

  // Since the Go through the zero-th block
  var bin = this._bin;
  var view = new DataView(bin);
  var length = view.getUint16(0, true);
  var contentLength = view.getUint16(2, true);

  var keyBlockByteOffset = (2 + contentLength) << 1;
  var addressBlockByteOffset = (2 + contentLength + length) << 1;
  var keyBlockView = new DataView(bin, keyBlockByteOffset, length << 1);
  var addressBlockView = new DataView(bin, addressBlockByteOffset, length << 2);

  var j, result, dataPack;
  for (var i = 0; i < length; i++) {
    result = this._getBlockContent(addressBlockView.getUint32(i << 2, true));
    if (!result) {
      continue;
    }
    dataPack = Object.create(JSZhuyinDataPack.prototype);
    JSZhuyinDataPack.apply(dataPack, result);

    for (j = 0; j < str.length; j++) {
      if (dataPack.getResultsBeginsWith(str[j]).length) {
        res[j] = keyBlockView.getUint16(i << 1, true);
      }
    }
  }

  return res;
};
/**
 * Clean up the get() cache. Any key that is not a substring of the superset
 * string will have their value removed.
 * @param  {array(number)?} supersetCodes The superset code array.
 */
JSZhuyinDataPackStorage.prototype.cleanupCache = function(supersetCodes) {
  this.incompleteMatchedCache.cleanup(supersetCodes);
};
/**
 * Internal method to reduce the bits in code to be 2nd symbols of each pair,
 * in the interchange symbols property, if 1st symbols present in the phontics.
 * @param  {number} c One phontic represented in number
 * @return {number}   Converted number.
 */
JSZhuyinDataPackStorage.prototype._replaceInterchangeableSymbols = function(c) {
  if (!this._interchangeablePairs) {
    return c;
  }
  var arr = this._interchangeablePairsArr;
  var n = arr.length;
  for (var i = 0; i < n; i += 2) {
    c = BopomofoEncoder.replace(c, arr[i], arr[i + 1]);
  }

  return c;
};
