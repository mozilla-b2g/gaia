'use strict';

/* exported MockMozNfc */
/* global MockDOMRequest */

var MockMozNfc = {
  onpeerready: null,
  getNFCPeer: function(event) {
    return this.MockNFCPeer;
  },
  notifySendFileStatus: function() {
  },
  MockNFCPeer: {
    sendNDEF: function(records) {
      return new MockDOMRequest();
    }
  }
};
