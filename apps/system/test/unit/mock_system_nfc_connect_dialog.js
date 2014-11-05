/* exported MockNfcConnectSystemDialog */
'use strict';

(function(exports) {

  var MockNfcConnectSystemDialog = function NfcConnectSystemDialog(options) {
    if (options) {
      this.options = options;
    }
    this.instanceID = 'fake-nfc-connect-dialog';
    var dialogFake = document.createElement('div');
    dialogFake.setAttribute('id', 'fake-nfc-connect-dialog');
    this.element = dialogFake;
  };

  MockNfcConnectSystemDialog.prototype.show =
    function mncsd_show(localName, onconfirm, onabort) {
    onconfirm();
  };

  exports.MockNfcConnectSystemDialog = MockNfcConnectSystemDialog;
})(window);