/* globals LazyLoader, resizeImage */
'use strict';

var utils = window.utils || {};

if (typeof utils.squareImage === 'undefined') {
  utils.squareImage = function(blob, callback) {
    LazyLoader.load(['/contacts/js/utilities/resize_image.js'], function() {
      resizeImage({
        blob: blob,
        mimeType: 'image/jpeg',
        transform: function(origWidth, origHeight, draw, cancel) {
          if (origWidth == origHeight) {
            cancel();
            callback(blob);
            return;
          }

          var min = Math.min(origWidth, origHeight);
          var x = (origWidth - min) / 2;
          var y = (origHeight - min) / 2;
          draw(x, y, min, min, min, min);
        },
        success: callback,
      });
    });
  }; // utils.squareImage
} // if
