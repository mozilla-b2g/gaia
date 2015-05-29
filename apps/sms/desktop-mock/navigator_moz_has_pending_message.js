(function() {
  'use strict';

  if (navigator.mozHasPendingMessage) {
    return;
  }

  navigator.mozHasPendingMessage = () => false;
})();
