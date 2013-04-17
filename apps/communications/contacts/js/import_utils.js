'use strict';

(function() {
  var importUtils = window.importUtils = {};

  // Scale ratio for different devices
  var SCALE_RATIO = window.innerWidth / 320;

  // Minimum size in px for profile detail image
  var IMG_DETAIL_WIDTH = 200;

  // Minimum size in px for profile thumbnail image
  var IMG_THUMB_SIZE = 120;

  function scale(size) {
    return Math.round(SCALE_RATIO * size);
  }

  importUtils.getPreferredPictureBox = function() {
    var out = {
      width: scale(IMG_THUMB_SIZE)
    };

    out.height = out.width;

    return out;
  };

  importUtils.getPreferredPictureDetail = function() {
    return scale(IMG_DETAIL_WIDTH);
  };
})();
