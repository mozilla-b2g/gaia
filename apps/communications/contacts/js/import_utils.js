'use strict';

(function() {
  var importUtils = window.importUtils = {};

  // Scale ratio for different devices
  var SCALE_RATIO = window.innerWidth / 320;

  var LAST_IMPORT_TIMESTAMP_SUFFIX = '_last_import_timestamp';

  function scale(size) {
    return Math.round(SCALE_RATIO * size);
  }

  importUtils.getPreferredPictureBox = function() {
    var imgThumbSize = oauthflow.params['facebook'].imgThumbSize;
    var out = {
      width: scale(imgThumbSize)
    };

    out.height = out.width;

    return out;
  };

  importUtils.getPreferredPictureDetail = function() {
    var imgDetailWidth = oauthflow.params['facebook'].imgDetailWidth;
    return scale(imgDetailWidth);
  };

  importUtils.setTimestamp = function(type, callback) {
    asyncStorage.setItem(type + LAST_IMPORT_TIMESTAMP_SUFFIX, Date.now(),
                         callback);
  };

  importUtils.getTimestamp = function(type, callback) {
    asyncStorage.getItem(type + LAST_IMPORT_TIMESTAMP_SUFFIX, callback);
  };
})();
