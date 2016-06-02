(function() {
  'use strict';

  if (!navigator.mozHasPendingMessage) {
    navigator.mozHasPendingMessage = () => false;
  }

  if (!navigator.mozSetMessageHandler) {
    navigator.mozSetMessageHandler = () => {};
  }
})();
