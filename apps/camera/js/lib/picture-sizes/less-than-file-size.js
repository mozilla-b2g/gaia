define(function(require, exports, module) {
'use strict';

var estimateJpegFileSize = function(width, height, bpp) {
  bpp = bpp || 24;
  var bitmapSizeInBytes = width * height * bpp / 8;
  return bitmapSizeInBytes / window.CONFIG_AVG_JPEG_COMPRESSION_RATIO;
};

/**
 * Returns all pictureSize options,
 * with overall bytes (estimation),
 * less than the bytes given.
 *
 * @param  {Number} bytes
 * @param  {Array} sizes
 * @return {Boolean}
 */
module.exports = function(bytes, sizes) {
  return sizes.filter(function(option) {
    var size = option.data;
    var fileSize = estimateJpegFileSize(size.width, size.height);
    return fileSize <= bytes;
  });
};

});
