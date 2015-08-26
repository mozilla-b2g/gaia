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
  this.data = Object.create(null);
};
/**
 * set the value of a key.
 * @param  {string} key   Key.
 * @param  {any}    value Value.
 * @this   {object}       CacheStore instance.
 */
CacheStore.prototype.add = function cs_add(key, value) {
  this.data[key] = value;
};
/**
 * get the value of a key.
 * @param  {string} key Key.
 * @return {any}        Value of the key.
 * @this   {object}     CacheStore instance.
 */
CacheStore.prototype.get = function cs_get(key) {
  return this.data[key];
};
/**
 * Clean up the store. Any key that is not a substring of the superset
 * string will have their value removed.
 * @param  {string} supersetStr The superset string.
 * @this   {object}             CacheStore instance.
 */
CacheStore.prototype.cleanup = function cs_cleanup(supersetStr) {
  for (var key in this.data) {
    if (supersetStr.indexOf(key) !== -1) {
      continue;
    }

    this.data[key] = undefined;
  }
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
 * @param  {string}       key          string to query.
 * @return {arraybuffer}               the result.
 */
BinStorage.prototype.get = function bs_get(key) {
  if (!this.loaded) {
    throw 'BinStorage: not loaded.';
  }

  var keyArray = key.split('').map(function str2CharCode(char) {
    return char.charCodeAt(0);
  });

  var code;
  var byteOffset = 0;
  while ((code = keyArray.shift()) !== undefined) {
    byteOffset = this.searchBlock(code, byteOffset);
    if (byteOffset === -1) {
      return undefined;
    }
  }
  return this._getBlockContent(byteOffset);
};
/**
 * Look for all value begin with this key.
 * @param  {string}              key      string to query.
 * @return {array(arraybuffer)}           the results.
 */
BinStorage.prototype.getRange = function bs_getRange(key) {
  if (!this.loaded) {
    throw 'BinStorage: not loaded.';
  }

  var keyArray = key.split('').map(function str2CharCode(char) {
    return char.charCodeAt(0);
  });

  var code;
  var byteOffset = 0;
  while ((code = keyArray.shift()) !== undefined) {
    byteOffset = this.searchBlock(code, byteOffset);
    if (byteOffset === -1) {
      return [];
    }
  }

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
 * @return {array} array contain 3 elements
 *   - First element is the reference to the arrayBuffer
 *   - Second element is the byteOffset the content begins.
 *   - Third element is the length of the content.
 */
BinStorage.prototype._getBlockContent =
  function bs_getBlockContent(byteOffset) {
    var bin = this._bin;
    var view = new DataView(bin, byteOffset);
    var contentLength = view.getUint16(2, true);

    if (contentLength === 0) {
      return undefined;
    }

    return [bin, byteOffset + (2 << 1), contentLength];
  };

var JSZhuyinDataPackStorage = function() {
  this.cache = new CacheStore();
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
  this.cache.cleanup('');

  var encodedSounds = BopomofoEncoder.encode(str);

  if (encodedSounds.length % 2) {
    throw new Error('JSZhuyinDataPackStorage: Expects string to store pairs.');
  }

  var arr = new Uint16Array(encodedSounds.length);
  var i = str.length;
  while (i--) {
    arr[i] = encodedSounds.charCodeAt(i);
  }

  this._interchangeablePairs = str;
  this._interchangeablePairsArr = arr;
};
/**
 * Get values from storage, disregards interchangeable pairs.
 * @param  {string}       key          string to query.
 * @return {JSZhuyinData}              the resulting JSZhuyinData instance.
 */
JSZhuyinDataPackStorage.prototype.get = function(key) {
  if (this.cache.get(key)) {
    return this.cache.get(key);
  }

  var result = BinStorage.prototype.get.call(this, key);

  if (result) {
    // This is equal to |new JSZhuyinDataPack(..)| but take array of arugments
    var dataPack = Object.create(JSZhuyinDataPack.prototype);
    JSZhuyinDataPack.apply(dataPack, result);

    this.cache.add(key, dataPack);
    return dataPack;
  }

  // result should be undefined.
  return result;
};
/**
 * Look for all value begin with this key, disregards interchangeable pairs.
 * @param  {string}              key      string to query.
 * @return {array(JSZhuyinData)}          the resulting JSZhuyinData instance.
 */
JSZhuyinDataPackStorage.prototype.getRange = function() {
  return BinStorage.prototype.getRange.apply(this, arguments)
    .map(function(result) {
      var dataPack = Object.create(JSZhuyinDataPack.prototype);
      JSZhuyinDataPack.apply(dataPack, result);
      return dataPack;
    });
};
/**
 * Return all results that matches to given partial encoded Bopomofo string.
 * @param  {string}              key     string to query.
 * @return {JSZhuyinDataPackCollection|JSZhuyinDataPack}
 *                                       A JSZhuyinDataPackCollection instance
 *                                       representing the results,
 *                                       or one single JSZhuyinDataPack if there
 *                                       is only one result.
 */
JSZhuyinDataPackStorage.prototype.getIncompleteMatched = function(key) {
  if (!this.loaded) {
    throw new Error('JSZhuyinDataPackStorage: not loaded.');
  }

  if (this.cache.get(key)) {
    return this.cache.get(key);
  }

  var keyArray = key.split('').map(function str2CharCode(char) {
    return char.charCodeAt(0);
  });

  var addressesAndKeys = [[0, '']];
  var code, a, i, ak, results;

  while ((code = keyArray.shift()) !== undefined) {
    ak = [];
    for (i = 0; i < addressesAndKeys.length; i++) {
      // If the code represents a completed phontics, we should
      // use searchBlock() instead of doing linear workathough with
      // _getIncompleteMatchedCodesInBlock() since there can be only one match.
      if (!this._interchangeablePairs &&
          BopomofoEncoder.isCompleted(code)) {
        a = this.searchBlock(code, addressesAndKeys[i][0]);
        if (a !== -1) {
          ak = ak.concat([
            [ a,  addressesAndKeys[i][1] + String.fromCharCode(code) ] ]);
        }

        continue;
      }

      results =
        this._getIncompleteMatchedCodesInBlock(code, addressesAndKeys[i][0]);
      ak = ak.concat(results[1].map(function(address, j) {
        return [
          address,
          addressesAndKeys[i][1] + String.fromCharCode(results[0][j])
        ];
      }));
    }
    addressesAndKeys = ak;
  }

  var dataPacks = addressesAndKeys
    .map(function(addressAndKey) {
      var result = this._getBlockContent(addressAndKey[0]);
      return result ? result.concat(addressAndKey[1]) : undefined;
    }, this)
    .filter(function(resultWithKey) {
      return !!resultWithKey;
    })
    .map(function(resultWithKey) {
      var dataPack = Object.create(JSZhuyinDataPack.prototype);
      JSZhuyinDataPack.apply(dataPack, resultWithKey);
      return dataPack;
    });

  if (!dataPacks.length) {
    return undefined;
  }

  var dataPackCollection = new JSZhuyinDataPackCollection(dataPacks);
  this.cache.add(key, dataPackCollection);

  return dataPackCollection;
};
/**
 * Internal method to get all the addresses point from a given block that
 * matches the code with BopomofoEncoder.isIncompletionOf().
 * @param  {number}   code            code of the character.
 * @param  {numbber}  byteOffset      Byte offset of the block.
 * @return {array}  array of code and byte offsets in number[] format.
 */
JSZhuyinDataPackStorage.prototype._getIncompleteMatchedCodesInBlock =
function jdps__getIncompleteMatchedCodesInBlock(code, byteOffset) {
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

  var codes = [], addresses = [], c;
  for (var i = 0; i < length; i++) {
    c = this._replaceInterchangeableSymbols(
      keyBlockView.getUint16(i << 1, true));
    if (BopomofoEncoder.isIncompletionOf(code, c)) {
      codes.push(c);
      addresses.push(addressBlockView.getUint32(i << 2, true));
    }
  }

  return [ codes, addresses ];
};
/**
 * Clean up the get() cache. Any key that is not a substring of the superset
 * string will have their value removed.
 * @param  {string} supersetStr The superset string.
 * @this   {object}             CacheStore instance.
 */
JSZhuyinDataPackStorage.prototype.cleanupCache = function(supersetStr) {
  this.cache.cleanup(supersetStr);
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
