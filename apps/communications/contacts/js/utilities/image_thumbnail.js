/* globals LazyLoader, resizeImage */
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
    LazyLoader.load(['/contacts/js/utilities/resize_image.js'], function() {
      resizeImage({
        blob: blob,
        mimeType: 'image/jpeg',
        transform: function(origWidth, origHeight, draw, cancel) {
          if (origWidth <= thumbnailEdge && origHeight <= thumbnailEdge) {
            cancel();
            callback(blob);
            return;
          }

          var widthFactor = thumbnailEdge / origWidth;
          var heightFactor = thumbnailEdge / origHeight;
          var factor = Math.max(widthFactor, heightFactor);
          var targetWidth = origWidth * factor;
          var targetHeight = origHeight * factor;
          draw(0, 0, origWidth, origHeight, targetWidth, targetHeight);
        },
        success: callback,
        error: callback.bind(null, blob)
      });
    });
  };
})(utils);
