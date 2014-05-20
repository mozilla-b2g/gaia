/* exported MockBluetoothTransfer */
/* globals NfcHandoverManager */
'use strict';

(function(exports) {

  var MockBluetoothTransfer = {
    sendFileQueueEmpty: true,

    sendFileViaHandover: function(mac, blob) {
      setTimeout(function() {
        var details = {received: false,
                       success: true,
                       viaHandover: true};
        NfcHandoverManager.transferComplete(details);
      });
    },

    isSendFileQueueEmpty: function() {
      return MockBluetoothTransfer.sendFileQueueEmpty;
    }
  };

  exports.MockBluetoothTransfer = MockBluetoothTransfer;
})(window);