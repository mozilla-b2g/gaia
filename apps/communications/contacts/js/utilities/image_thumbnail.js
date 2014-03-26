'use strict';

var utils = window.utils || {};

(function(utils) {
  var dpr = window.devicePixelRatio || 1;
  var thumbnailEdge = 60 * dpr;

  if (typeof utils.thumbnailImage !== 'undefined') {
    return;
  }

  // We keep the aspect ratio and make the smallest edge be
  // |thumbnailEdge| long.
  utils.thumbnailImage = function(blob, callback) {
    var img = document.createElement('img');
    var url = URL.createObjectURL(blob);
    img.src = url;

    function cleanupImg() {
      img.src = '';
      URL.revokeObjectURL(url);
    }

    img.onload = function onBlobLoad() {

      var width = img.width;
      var height = img.height;

      if (width <= thumbnailEdge && height <= thumbnailEdge) {
        cleanupImg();
        callback(blob);
        return;
      }

      var widthFactor = thumbnailEdge / width;
      var heightFactor = thumbnailEdge / height;
      var factor = Math.max(widthFactor, heightFactor);

      var canvas = document.createElement('canvas');
      canvas.width = width * factor;
      canvas.height = height * factor;
      var context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(img, 0, 0, width * factor, height * factor);
      cleanupImg();
      canvas.toBlob(function onCanvasToBlob(canvasBlob) {
        context = null;
        canvas.width = canvas.height = 0;
        canvas = null;
        callback(canvasBlob);
      });
    };

    img.onerror = function onError() {
      cleanupImg();
      callback(blob);
    };
  };
})(utils);
