define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var getAspect = require('./get-aspect');

/**
 * Returns a formatted list of picture
 * sizes ready to be set as setting options.
 *
 * Options:
 *
 *   - `maxPixelSize {Number}`
 *   - `exclude {Array}`
 *
 * @param  {Array} sizes
 * @param  {Object} options
 * @return {Array}
 */
module.exports = function(sizes, options) {
  var maxPixelSize = options && options.maxPixelSize;
  var exclude = options && options.exclude || {};
  var include = options && options.include;
  var formatted = [];
  var hash = {};

  exclude.aspects = exclude.aspects || [];
  exclude.keys = exclude.keys || [];

  sizes.forEach(function(size) {
    var w = size.width;
    var h = size.height;
    var key = w + 'x' + h;
    var pixelSize = w * h;

    if (hash[key]) { return; }

    size.aspect = getAspect(w, h);

    // Don't include pictureSizes above the maxPixelSize limit
    if (maxPixelSize && pixelSize > maxPixelSize) { return; }

    if (include) {
      if (include.keys && !~include.keys.indexOf(key)) { return; }
      if (include.aspects && !~include.aspects.indexOf(size.aspect)) { return; }
    }


    if (exclude.keys.indexOf(key) > -1) { return; }
    if (exclude.aspects.indexOf(size.aspect) > -1) { return; }

    size.mp = getMP(w, h);
    hash[key] = true;

    formatted.push({
      key: key,
      pixelSize: pixelSize,
      data: size
    });
  });

  // Sort by pixel size
  formatted.sort(function(a, b) { return b.pixelSize - a.pixelSize; });
  return formatted;
};

/**
 * Returns rounded mega-pixel value.
 *
 * @param  {Number} w
 * @param  {Number} h
 * @return {Number}
 */
function getMP(w, h) {
  return Math.round((w * h) / 1000000);
}

});
