'use strict';

// This file implemented BinStorage, an in-memory key-value storage (for now).

/**
 * BinStorage rely on a big chunk of encoded ArrayBuffer to do the lookup.
 * @constructor
 */
var BinStorage = function BinStorage() {
  this.loaded = false;
  this.loading = false;
  this._bin = undefined;
};
/**
 * Database file to load.
 * @type {String}
 */
BinStorage.prototype.DATA_URL = '';
/**
 * Load the database.
 * @this {object} BinStorage instance.
 */
BinStorage.prototype.load = function bs_load() {
  if (this.loading)
    throw 'BinStorage: You cannot called load() twice.';

  if (this.loaded)
    this.unload();

  var xhr = new XMLHttpRequest();
  xhr.open('GET', this.DATA_URL);
  xhr.responseType = 'arraybuffer';

  var self = this;
  xhr.onreadystatechange = function xhrReadystatechange() {
    if (xhr.readyState !== xhr.DONE)
      return;

    var data = xhr.response;
    if (!data || (xhr.status && xhr.status !== 200)) {
      self.loading = false;

      if (typeof self.onerror === 'function')
        self.onerror();
      if (typeof self.onloadend === 'function')
        self.onloadend();
      return;
    }

    self._bin = data;

    self.loaded = true;
    self.loading = false;

    if (typeof self.onload === 'function')
      self.onload();
    if (typeof self.onloadend === 'function')
      self.onloadend();
  };
  xhr.send();
};
/**
 * Unoad the database.
 * @this {object} BinStorage instance.
 */
BinStorage.prototype.unload = function bs_unload() {
  if (this.loading)
    throw 'BinStorage: load() in progress.';

  this._bin = undefined;
  this.loaded = false;
};
/**
 * Get values from storage.
 * @param  {string}       key          string to query.
 * @return {arraybuffer}               the result.
 */
BinStorage.prototype.get = function bs_get(key) {
  if (!this.loaded)
    throw 'BinStorage: not loaded.';

  var keyArray = key.split('').map(function str2CharCode(char) {
    return char.charCodeAt(0);
  });

  var code;
  var byteOffset = 0;
  while ((code = keyArray.shift()) !== undefined) {
    byteOffset = this._searchBlock(code, byteOffset);
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
  if (!this.loaded)
    throw 'BinStorage: not loaded.';

  var keyArray = key.split('').map(function str2CharCode(char) {
    return char.charCodeAt(0);
  });

  var code;
  var byteOffset = 0;
  while ((code = keyArray.shift()) !== undefined) {
    byteOffset = this._searchBlock(code, byteOffset);
    if (byteOffset === -1) {
      return [];
    }
  }

  var bin = this._bin;
  var self = this;
  var result = [];

  var getBlockContents = function bs_getBlockContents(byteOffset) {
    var header = new Uint16Array(bin, byteOffset, 2);

    if (!header[0])
      return;

    var addressBlockByteOffset = byteOffset +
        (2 + header[1] + header[0]) * (Uint16Array.BYTES_PER_ELEMENT || 2);

    // Consider the size of the padding.
    if (addressBlockByteOffset % (Uint32Array.BYTES_PER_ELEMENT || 4))
      addressBlockByteOffset += (Uint16Array.BYTES_PER_ELEMENT || 2);

    var addressBlock = new Uint32Array(bin, addressBlockByteOffset, header[0]);

    var i = addressBlock.length;
    while (i--) {
      var content = self._getBlockContent(addressBlock[i]);
      if (content) {
        result.push(content);
      }

      getBlockContents(addressBlock[i]);
    }
  };

  getBlockContents(byteOffset);
  return result;
};
/**
 * Internal method for search a given block for a single character.
 * @param  {number}   code        code of the character.
 * @param  {numbber}  byteOffset  Byte offset of the block.
 * @return {number}   byteOffset of the block found, or -1.
 */
BinStorage.prototype._searchBlock = function bs_searchBlock(code, byteOffset) {
  var bin = this._bin;
  var header = new Uint16Array(bin, byteOffset, 2);

  var keyBlockByteOffset = byteOffset +
      (2 + header[1]) * (Uint16Array.BYTES_PER_ELEMENT || 2);

  var addressBlockByteOffset = byteOffset +
      (2 + header[1] + header[0]) * (Uint16Array.BYTES_PER_ELEMENT || 2);

  // Consider the size of the padding.
  if (addressBlockByteOffset % (Uint32Array.BYTES_PER_ELEMENT || 4))
    addressBlockByteOffset += (Uint16Array.BYTES_PER_ELEMENT || 2);

  var keyBlock = new Uint16Array(bin, keyBlockByteOffset, header[0]);
  var addressBlock = new Uint32Array(bin, addressBlockByteOffset, header[0]);

  // Do a interpolation search
  var low = 0;
  var high = keyBlock.length - 1;
  var mid;

  while (keyBlock[low] <= code && keyBlock[high] >= code) {
    mid = low +
      (((code - keyBlock[low]) * (high - low)) /
        (keyBlock[high] - keyBlock[low])) | 0;

    if (keyBlock[mid] < code) {
      low = mid + 1;
    } else if (keyBlock[mid] > code) {
      high = mid - 1;
    } else {
      return addressBlock[mid];
    }
  }

  if (keyBlock[low] === code) {
    return addressBlock[low];
  } else {
    return -1;
  }
};
/**
 * Internal method for getting the content of the block.
 * @param  {numbber}  byteOffset  Byte offset of the block.
 * @return {string}   Content of the value.
 */
BinStorage.prototype._getBlockContent =
  function bs_getBlockContent(byteOffset) {
    var bin = this._bin;
    var header = new Uint16Array(bin, byteOffset, 2);

    if (header[1] === 0)
      return undefined;

    return [
      this._bin,
      byteOffset + 2 * (Uint16Array.BYTES_PER_ELEMENT || 2),
      header[1]];
  };
