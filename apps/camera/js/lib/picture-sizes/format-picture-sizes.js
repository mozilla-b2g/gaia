define(function(require, exports, module) {
'use strict';

/**
 * Returns a formatted list of picture
 * sizes ready to be set as setting options.
 *
 * Options:
 *
 *   - `maxPixelSize {Number}`
 *   - `exclude {Array}`
 *   - `mp {String}`
 *
 * @param  {Array} sizes
 * @param  {Object} options
 * @return {Array}
 */
module.exports = function(sizes, options) {
  var maxPixelSize = options && options.maxPixelSize;
  var exclude = options && options.exclude || [];
  var MP = options && options.mp || 'MP';
  var formatted = [];

  sizes.forEach(function(size) {
    var w = size.width;
    var h = size.height;
    var key = w + 'x' + h;
    var pixelSize = w * h;

    // Don't include picture size if marked as excluded
    if (exclude.indexOf(key) > -1) { return; }

    // Don't include pictureSizes above the maxPixelSize limit
    if (maxPixelSize && pixelSize > maxPixelSize) { return; }

    size.aspect = getAspect(w, h);
    size.mp = getMP(w, h);

    // Don't show 0MP
    var mp = size.mp ? size.mp + MP + ' ' : '';

    formatted.push({
      key: key,
      title: mp + w + 'x' + h + ' ' + size.aspect,
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

/**
 * Returns aspect ratio string.
 *
 * Makes use of Euclid's GCD algorithm,
 * http://en.wikipedia.org/wiki/Euclidean_algorithm
 *
 * @param  {Number} w
 * @param  {Number} h
 * @return {String}
 */
function getAspect(w, h) {
  var gcd = function(a, b) { return (b === 0) ? a : gcd(b, a % b); };
  var divisor = gcd(w, h);
  return (w / divisor) + ':' + (h / divisor);
}

});
