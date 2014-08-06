(function(exports) {
'use strict';

exports.isOnline = function() {
  if (!navigator || !('onLine' in navigator)) {
    return false;
  }

  return navigator.onLine;
};

}(Calendar));
