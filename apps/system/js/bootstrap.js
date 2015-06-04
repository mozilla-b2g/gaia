/* global App */

'use strict';
(function() {
  /**
   * This file should never be changed or add new functionalities.
   * The responsibility is only start the app instance and catch
   * the error from the start function.
   *
   * The main reason is this file is not test-able so
   * it should not grow anyway.
   *
   * If you have a new module, please find a proper parent
   * in the dependency tree and put it there.
   */
  window.app = new App();
  var startApp = function() {
    window.app.start().catch(function(err) {
      console.error(err);
      console.trace();
    });
  };
  if (document.readyState !== 'loading') {
    startApp();
  } else {
    document.addEventListener('readystatechange',
      function readyStateChange() {
        if (document.readyState == 'interactive') {
          document.removeEventListener('readystatechange',
            readyStateChange);
          startApp();
        }
      });
  }
}());
