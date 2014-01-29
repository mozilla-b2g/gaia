'use strict';

(function(exports) {

  var MockSecureWindowManager = function SecureWindowManager() {};

  // It should be exposed only events.
  MockSecureWindowManager.prototype.handleEvent =
  function() {};

  exports.MockSecureWindowManager = MockSecureWindowManager;
})(window);
