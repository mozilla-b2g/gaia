'use strict';
(function(exports) {

  var MockNfc = {
    startPoll: function() { return Promise.resolve(); },

    stopPoll: function() { return Promise.resolve(); },

    powerOff: function() { return Promise.resolve(); },

    checkP2PRegistration: function(manifestURL) {
      return Promise.resolve(true);
    },

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
