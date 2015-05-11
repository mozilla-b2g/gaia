'use strict';

(function(exports) {
  exports.Utils = {
    holdFocusForAnimation: function utils_holdFocusForAnimation() {
      // we have to move focus to another element to prevent user press enter
      // to trigger unexpected behavior. We cannot use blur() to do it because
      // it makes smart-home without focus. In this case, other apps can
      // request focus from smart-home which makes focus lost, bug 1161940.
      document.getElementById('main-section').focus();
    }
  };
})(window);
