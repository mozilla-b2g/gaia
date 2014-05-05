/* jshint unused: false */

'use strict';

var TextUtils = {
  _cacheContext: {},
  _getContextFor: function tu_getContextFor(fontSize, fontFace) {
    var cache = this._cacheContext;
    var ctx = cache[fontSize] ? cache[fontSize][fontFace] : null;

    if (!ctx) {
      var canvas = document.createElement('canvas');
      canvas.setAttribute('moz-opaque', 'true');
      canvas.setAttribute('width', '1');
      canvas.setAttribute('height', '1');

      ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.font = fontSize + 'px ' + fontFace;

      // Populate the contexts cache.
      if (!cache[fontSize]) {
        cache[fontSize] = {};
      }
      cache[fontSize][fontFace] = ctx;
    }

    return ctx;
  },

  getTextInfosFor: function tu_getTextInfosFor(string, parameters) {
    var fontSize = parameters.fontSize.current;
    var fontFace = parameters.fontFace;

    // Get a context from the cache if any.
    var ctx = this._getContextFor(fontSize, fontFace);

    var resultWidth = ctx.measureText(string).width;
    var maxWidth = parameters.maxWidth;
    var allowedSizes = parameters.fontSize.allowed;

    var i = 0;
    while (resultWidth < maxWidth && i < allowedSizes.length) {
      fontSize = allowedSizes[i];
      ctx = this._getContextFor(fontSize, fontFace);
      resultWidth = ctx.measureText(string).width;

      i++;
    }

    i = allowedSizes.length - 1;
    while (resultWidth > maxWidth && i >= 0) {
      fontSize = allowedSizes[i];
      ctx = this._getContextFor(fontSize, fontFace);
      resultWidth = ctx.measureText(string).width;

      i--;
    }

    return { fontSize: fontSize, overflow: resultWidth > maxWidth };
  },

  getOverflowCount: function tu_getOverflowCount(string, parameters) {
    var fontSize = parameters.fontSize.current;
    var fontFace = parameters.fontFace;

    // Get a context from the cache if any.
    var ctx = this._getContextFor(fontSize, fontFace);
    var resultWidth = ctx.measureText(string).width;

    var maxWidth = parameters.maxWidth;
    var counter = 0;
    while (string.length && resultWidth > maxWidth) {
      string = string.substr(0, string.length - 1);
      resultWidth = ctx.measureText(string).width;
      counter++;
    }

    return counter;
  },

  resetCache: function tu_resetCache() {
    this._cacheContext = {};
  }
};

