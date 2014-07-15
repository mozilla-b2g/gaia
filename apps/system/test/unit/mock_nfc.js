'use strict';
(function(exports) {

  var MockNfc = {
    startPoll: function() { return {}; },
    stopPoll: function() { return {}; },
    powerOff: function() { return {}; },

    checkP2PRegistration: function(manifestURL) { return {}; },
    notifyUserAcceptedP2P: function(manifestURL) { return {}; }
  };

  exports.MockNfc = MockNfc;
})(window);
