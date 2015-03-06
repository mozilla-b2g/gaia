'use strict';

/* exported MockBluetoothTransfer */
/* globals MockDOMRequest */

(function(exports) {

  var MockBluetoothTransfer = {
    mNfcHandoverManager: null,
    sendFileQueueEmpty: true,
    fileTransferInProgress: false,
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
    },

    get isFileTransferInProgress() {
      return MockBluetoothTransfer.fileTransferInProgress;
    }
  };

  exports.MockBluetoothTransfer = MockBluetoothTransfer;
})(window);
