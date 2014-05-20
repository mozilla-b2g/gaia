'use strict';

/* exported MockMozNfc */

var MockMozNfc = {
  onpeerready: null,
  getNFCPeer: function(event) {
    return this.MockNFCPeer;
  },
  MockNFCPeer: {
    sendNDEF: function(records) {
      return {};
    }
  },
  notifySendFileStatus: function() {}
};

