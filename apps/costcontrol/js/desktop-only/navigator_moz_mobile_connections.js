(function() {
  'use strict';

  if (navigator.mozMobileConnections) {
    return;
  }

  navigator.mozMobileConnections = navigator.mozIccManager.iccIds.map((id) => {
    return { iccId: id};
  });
})();
