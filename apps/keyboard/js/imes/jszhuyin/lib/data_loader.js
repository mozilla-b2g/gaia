'use strict';

/**
 * DataLoader wraps XMLHTTPRequest and pull the JSZhuyin dictionary if it is
 * not passed into the setup.
 */
var DataLoader = function() {
  this.loaded = false;
  this.loading = false;
};
/**
 * Database file to load.
 * @type {string}
 */
DataLoader.prototype.DATA_URL = '../data/database.data';
/**
 * Once loaded, data will be available here.
 * @type {object}
 */
DataLoader.prototype.data = null;
/**
 * Run when the loading is complete.
 * @type {function}
 */
DataLoader.prototype.onloadend = null;
/**
 * Run when loading is successful.
 * @type {function}
 */
DataLoader.prototype.onload = null;
/**
 * Run when error occours.
 * @type {function}
 */
DataLoader.prototype.onerror = null;

/**
 * Load the data
 */
DataLoader.prototype.load = function bs_load() {
  if (this.loading) {
    throw new Error('DataLoader: You cannot call load() twice.');
  }

  var xhr = new XMLHttpRequest();
  xhr.open('GET', this.DATA_URL);
  xhr.responseType = 'arraybuffer';

  xhr.onreadystatechange = function xhrReadystatechange() {
    if (xhr.readyState !== xhr.DONE) {
      return;
    }

    var data = this.data = xhr.response;
    if (!data || (xhr.status && xhr.status !== 200)) {
      this.loading = false;

      if (typeof this.onerror === 'function') {
        this.onerror();
      }
      if (typeof this.onloadend === 'function') {
        this.onloadend();
      }
      return;
    }

    this.loaded = true;
    this.loading = false;

    if (typeof this.onload === 'function') {
      this.onload();
    }
    if (typeof this.onloadend === 'function') {
      this.onloadend();
    }
  }.bind(this);
  xhr.send();
};
