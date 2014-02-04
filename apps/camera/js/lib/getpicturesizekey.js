define(function(require, exports, module) {
'use strict';

/**
 * Exports
 */

/**
 * Return a key to identify
 * a given width/height resolution.
 *
 * @param  {Object} size
 * @return {String}
 */
module.exports = function(size) {
  var w = size.width;
  var h = size.height;

  switch (true) {
    case (w === 640 && h === 480): return 'vga';
    default: return toMegaPixels(w, h) + 'mp';
  }
};

/**
 * Convert a width/height to
 * rounded MegaPixel value.
 *
 * @param  {Number} w
 * @param  {Number} h
 * @return {Number}
 */
function toMegaPixels(w, h) {
  return Math.round((w * h) / 1000000);
}

});
