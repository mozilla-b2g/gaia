/* global App */

'use strict';
(function() {
  window.app = new App();
  var startApp = function() {
    window.app.start().catch(function(err) {
      console.error(err);
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
