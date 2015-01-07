'use strict';

/* exported MockBluetoothTransfer */
/* globals MockDOMRequest */

(function(exports) {

  var MockBluetoothTransfer = {
    sendFileQueueEmpty: true,
    sendFileViaHandover: function(mac, blob) {
      var req = new MockDOMRequest();
      var details = {received: false,
                     success: true,
                     viaHandover: true};

      req.onsuccess = function() {
        window.dispatchEvent(new CustomEvent('nfc-transfer-complete', {
          detail: details
        }));
      };

      return req;
    },

    get isSendFileQueueEmpty() {
      return MockBluetoothTransfer.sendFileQueueEmpty;
    }
  };

  exports.MockBluetoothTransfer = MockBluetoothTransfer;
})(window);
