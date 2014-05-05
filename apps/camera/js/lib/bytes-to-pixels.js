define(function(require, exports, module) {
'use strict';

module.exports = function(bytes) {
  var bytesPerPixel = 3;
  var avgJpegCompression = window.CONFIG_AVG_JPEG_COMPRESSION_RATIO || 8;
  var uncompressedBytes = bytes * avgJpegCompression;
  return Math.round(uncompressedBytes / bytesPerPixel);
};

});