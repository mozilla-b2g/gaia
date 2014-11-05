'use strict';

/* exported MockBluetoothTransfer */
/* globals MockDOMRequest, NfcHandoverManager */

(function(exports) {

  var MockBluetoothTransfer = {
    sendFileQueueEmpty: true,
    sendFileViaHandover: function(mac, blob) {
      var req = new MockDOMRequest();
      var details = {received: false,
                     success: true,
                     viaHandover: true};

      req.onsuccess = function() {
        NfcHandoverManager.transferComplete(details);
      };

      return req;
    },

    get isSendFileQueueEmpty() {
      return MockBluetoothTransfer.sendFileQueueEmpty;
    }
  };

  exports.MockBluetoothTransfer = MockBluetoothTransfer;
})(window);
