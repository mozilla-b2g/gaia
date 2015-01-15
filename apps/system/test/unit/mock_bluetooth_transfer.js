'use strict';

/* exported MockBluetoothTransfer */

(function(exports) {

  var MockBluetoothTransfer = {
    sendFileQueueEmpty: true,

    get isSendFileQueueEmpty() {
      return MockBluetoothTransfer.sendFileQueueEmpty;
    }
  };

  exports.MockBluetoothTransfer = MockBluetoothTransfer;
})(window);
