'use strict';
(function(exports) {

  var MockNfcHandoverManager = {
    handleSimplifiedPairingRecord: function(ndef) {},
    handleHandoverSelect: function(ndef) {},
    handleHandoverRequest: function(ndef, session) {},
    isHandoverInProgress: function() { return undefined; },
    transferComplete: function(details) {}
  };

  exports.MockNfcHandoverManager = MockNfcHandoverManager;
})(window);
