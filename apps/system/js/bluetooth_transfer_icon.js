/* global System, BaseUI */
'use strict';

(function(exports) {
  var BluetoothTransferringIcon = function() {};
  BluetoothTransferringIcon.prototype = Object.create(BaseUI.prototype);
  BluetoothTransferringIcon.prototype.name = 'BluetoothTransferringIcon';
  BluetoothTransferringIcon.prototype.determine = function() {
    return this.manager.isProfileConnected(this.manager.Profiles.OPP);
  };
  exports.BluetoothTransferringIcon = BluetoothTransferringIcon;
}(window));
