/* global BaseIcon */
'use strict';

(function(exports) {
  var BluetoothTransferIcon = function(manager) {
    BaseIcon.call(this, manager);
  };
  BluetoothTransferIcon.prototype = Object.create(BaseIcon.prototype);
  BluetoothTransferIcon.prototype.name = 'BluetoothTransferIcon';
  BluetoothTransferIcon.prototype.shouldDisplay = function() {
    return this.manager.isProfileConnected(this.manager.Profiles.OPP);
  };
  exports.BluetoothTransferIcon = BluetoothTransferIcon;
}(window));
