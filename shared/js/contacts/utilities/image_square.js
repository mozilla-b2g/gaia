'use strict';

var utils = window.utils || {};

if (typeof utils.squareImage === 'undefined') {
  utils.squareImage = function(blob, callback) {
    var img = document.createElement('img');
    var url = URL.createObjectURL(blob);
    img.src = url;

    function cleanupImg() {
      img.src = '';
      URL.revokeObjectURL(url);
    }

    img.onerror = cleanupImg;

    img.onload = function onBlobLoad() {
      var width = img.width;
      var height = img.height;

      if (width === height) {
        cleanupImg();
        callback(blob);
      } else {
        var canvas = document.createElement('canvas');
        var min = canvas.width = canvas.height = Math.min(width, height);
        var context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(img, (width - min) / 2, (height - min) / 2, min, min,
                          0, 0, min, min);
        cleanupImg();
        canvas.toBlob(function onCanvasToBlob(canvasBlob) {
          context = null;
          canvas.width = canvas.height = 0;
          canvas = null;
          callback(canvasBlob);
        }, 'image/jpeg', 0.95);
      }
    };
  }; // utils.squareImage
} // if
