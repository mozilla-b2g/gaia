/* global System, BaseUI */
'use strict';

(function(exports) {
  var BluetoothHeadphoneIcon = function(manager) {
    this.manager = manager;
  };
  BluetoothHeadphoneIcon.prototype = Object.create(BaseUI.prototype);
  BluetoothHeadphoneIcon.prototype.constructor = BluetoothHeadphoneIcon;
  BluetoothHeadphoneIcon.prototype.EVENT_PREFIX = 'bluetoothheadphoneicon';
  BluetoothHeadphoneIcon.prototype.containerElement = document.getElementById('statusbar');
  BluetoothHeadphoneIcon.prototype.view = function() {
    return '<div id="' + this.instanceID + '" class="sb-icon sb-icon-bluetooth-headphones" ' +
            'role="listitem" hidden data-l10n-id="statusbarBluetoothHeadphones"></div>';
  };
  BluetoothHeadphoneIcon.prototype.instanceID = 'statusbar-bluetooth-headphone';
  BluetoothHeadphoneIcon.prototype._fetchElements = function() {
    this.element = document.getElementById(this.instanceID);
  };
  BluetoothHeadphoneIcon.prototype.show = function() {
    var hidden = this.element.hidden;
    if (!hidden) {
      return;
    }
    this.element.hidden = false;
    this.publish('shown');
  };
  BluetoothHeadphoneIcon.prototype.hide = function() {
    var hidden = this.element.hidden;
    if (hidden) {
      return;
    }
    this.element.hidden = true;
    this.publish('hidden');
  };
  BluetoothHeadphoneIcon.prototype.start = function() {
  };
  BluetoothHeadphoneIcon.prototype.stop = function() {
  };
  BluetoothHeadphoneIcon.prototype.isVisible = function() {
    return this.element && !this.element.hidden;
  };
  BluetoothHeadphoneIcon.prototype.update = function() {
    var icon = this.element;
    icon.hidden = !System.query('Bluetooth.isProfileConnected', 'A2DP');
    this.manager._updateIconVisibility();
  };
  exports.BluetoothHeadphoneIcon = BluetoothHeadphoneIcon;
}(window));
