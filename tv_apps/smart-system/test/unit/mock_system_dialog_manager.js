'use strict';

(function(exports) {

  var MockSystemDialogManager = function SystemDialogManager() {};

  // It should be exposed only events.
  MockSystemDialogManager.prototype.handleEvent =
  function() {};

  exports.MockSystemDialogManager = MockSystemDialogManager;
})(window);
