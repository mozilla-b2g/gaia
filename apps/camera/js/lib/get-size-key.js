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
exports.picture = function(size) {
  var w = size.width;
  var h = size.height;
  switch (true) {
    case (w === 640 && h === 480): return 'vga';
    default: return toMegaPixels(w, h) + 'mp';
  }
};

exports.video = function(size) {
  var w = size.width;
  var h = size.height;
  switch (true) {
    case (w === 176 && h === 144): return 'qcif';
    case (w === 320 && h === 240): return 'qvga';
    case (w === 1280 && h === 720): return 'hd';
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
  var MP = 1048576;
  return Math.round((w * h) / MP);
}

});
