'use strict';

/* exported MockBluetoothTransfer */
/* globals MockDOMRequest, NfcHandoverManager */

(function(exports) {

  var MockBluetoothTransfer = {
    sendFile: function() {
      var req = new MockDOMRequest();
      req.onsuccess = function() {
        NfcHandoverManager.transferComplete(true);
      };

      return req;
    }
  };

  exports.MockBluetoothTransfer = MockBluetoothTransfer;
})(window);
