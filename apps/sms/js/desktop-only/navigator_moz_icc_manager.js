console.time("navigator_moz_icc_manager.js");
(function() {
  'use strict';

  if (navigator.mozIccManager) {
    return;
  }

  navigator.mozIccManager = {
    iccIds: []
  };
})();
console.timeEnd("navigator_moz_icc_manager.js");
