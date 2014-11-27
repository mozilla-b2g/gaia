'use strict';

/* exported MockMozNfc */
/* global MockPromise */
require('/shared/test/unit/mocks/mock_promise.js');

var MockMozNfc = {
  onpeerready: null,
  notifySendFileStatus: function() {
  },
  MockNFCPeer: {
    isLost: false,
    sendNDEF: function(records) {
      return new MockPromise();
    }
  }
};
