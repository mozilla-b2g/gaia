'use strict';
(function(exports) {

  var MockNfcHandoverManager = {
    tryHandover: function(ndefMsg, session) { return false; },
    transferComplete: function(details) {},
    isHandoverInProgress: function() { return undefined; }
  };

  exports.MockNfcHandoverManager = MockNfcHandoverManager;
})(window);
