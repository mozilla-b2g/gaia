'use strict';

/* exported MockMozNfc */

var MockMozNfc = {
  onpeerready: null,
  getNFCPeer: function(event) {
    return {
      sendNDEF: function(records){}
    };
  }
};
