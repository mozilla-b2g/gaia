'use strict';

(function(exports) {
  var MockLockScreenWindowManager = function LockScreenWindowManager() {};

  // It should be exposed only events.
  MockLockScreenWindowManager.prototype.handleEvent =
  function() {};

  MockLockScreenWindowManager.prototype.createWindow =
  function() {};

  exports.MockLockScreenWindowManager = MockLockScreenWindowManager;
})(window);
