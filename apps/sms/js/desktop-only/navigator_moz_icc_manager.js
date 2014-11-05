(function() {
  'use strict';

  if (navigator.mozIccManager) {
    return;
  }

  navigator.mozIccManager = {
    iccIds: []
  };
})();
