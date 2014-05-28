/**
 * Do the bootstrap.
 */
'use strict';
(function(exports) {
  window.addEventListener('load', function startup() {
    // Bootstrap.
    /** @global lockScreen */
    exports.lockScreen = new window.LockScreen();
    exports.lockScreen.bootstrap();
  });
})(window);
