'use strict';
(function(exports) {

  var MockNfc = {
    startPoll: function() { return {}; },

    stopPoll: function() { return {}; },

    powerOff: function() { return {}; },

    checkP2PRegistration: function(manifestURL) { return {}; },

    notifyUserAcceptedP2P: function(manifestURL) { return {}; },

    onpeerready: function() {},

    getNFCPeer: function() {
      return {
        sendNDEF: function(req) {
          MockNfc.mSentRequest = req;
        }
      };
    },

    mTriggerOnpeerready: function(detail) {
      MockNfc.onpeerready(detail);
    },

    mSentRequest: null
  };

  exports.MockNfc = MockNfc;
})(window);
