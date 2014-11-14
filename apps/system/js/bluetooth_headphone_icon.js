/* global System, BaseUI */
'use strict';

(function(exports) {
  var BluetoothHeadphoneIcon = function(manager) {
    this.manager = manager;
  };
  BluetoothHeadphoneIcon.prototype = Object.create(BaseUI.prototype);
  BluetoothHeadphoneIcon.REGISTERED_EVENTS = ['bluetoothconnectionchange'];
  BluetoothHeadphoneIcon.prototype.constructor = BluetoothHeadphoneIcon;
  BluetoothHeadphoneIcon.prototype.CLASS_LIST = 'sb-icon sb-icon-bluetooth-headphones" ' +
  BluetoothHeadphoneIcon.prototype.l10nId = 'statusbarBluetoothHeadphones';
  BluetoothHeadphoneIcon.prototype.instanceID = 'statusbar-bluetooth-headphone';
  BluetoothHeadphoneIcon.prototype.update = function() {
    System.query('Bluetooth.isProfileConnected', 'A2DP') ? this.show() : this.hide();
  };
  exports.BluetoothHeadphoneIcon = BluetoothHeadphoneIcon;
}(window));
