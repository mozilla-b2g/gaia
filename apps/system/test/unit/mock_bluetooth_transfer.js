'use strict';

/* exported MockBluetoothTransfer */
/* globals MockDOMRequest */

(function(exports) {

  var MockBluetoothTransfer = {
    mNfcHandoverManager: null,
    sendFileQueueEmpty: true,
    sendFileViaHandover: function(mac, blob) {
      var self = this;
      var req = new MockDOMRequest();
      var details = {received: false,
                     success: true,
                     viaHandover: true};

      req.onsuccess = function() {
        self.mNfcHandoverManager.transferComplete({
          detail: details
        });
      };

      return req;
    },

    get isSendFileQueueEmpty() {
      return MockBluetoothTransfer.sendFileQueueEmpty;
    }
  };

  exports.MockBluetoothTransfer = MockBluetoothTransfer;
})(window);
