/* global System, BaseUI */
'use strict';

(function(exports) {
  var BluetoothTransferIcon = function(manager) {
    this.manager = manager;
  };
  BluetoothTransferIcon.prototype = Object.create(BaseUI.prototype);
  BluetoothTransferIcon.prototype.constructor = BluetoothTransferIcon;
  BluetoothTransferIcon.prototype.EVENT_PREFIX = 'BluetoothTransferIcon';
  BluetoothTransferIcon.prototype.containerElement = document.getElementById('statusbar');
  BluetoothTransferIcon.prototype.view = function() {
    return '<div id="statusbar-bluetooth-transferring" ' +
            'class="sb-icon sb-icon-bluetooth-transferring" role="listitem" ' +
            'hidden data-l10n-id="statusbarBluetoothTransferring"></div>';
  };
  BluetoothTransferIcon.prototype.instanceID = 'statusbar-bluetooth-transferring';
  BluetoothTransferIcon.prototype._fetchElements = function() {
    this.element = document.getElementById(this.instanceID);
  };
  BluetoothTransferIcon.prototype.show = function() {
    var hidden = this.element.hidden;
    if (!hidden) {
      return;
    }
    this.element.hidden = false;
    this.publish('shown');
  };
  BluetoothTransferIcon.prototype.hide = function() {
    var hidden = this.element.hidden;
    if (hidden) {
      return;
    }
    this.element.hidden = true;
    this.publish('hidden');
  };
  BluetoothTransferIcon.prototype.start = function() {
    window.addEventListener('bluetoothprofileconnectionchange', this);
  };
  BluetoothTransferIcon.prototype.stop = function() {
    window.removeEventListener('bluetoothprofileconnectionchange', this);
  };
  BluetoothTransferIcon.prototype.isVisible = function() {
    return this.element && !this.element.hidden;
  };
  BluetoothTransferIcon.prototype.handleEvent = function() {
    this.update();
  };
  BluetoothTransferIcon.prototype.update = function() {
    var icon = this.element;
    icon.hidden = !System.query('Bluetooth.isProfileConnected', 'OPP');
    this.manager._updateIconVisibility();
  };
  exports.BluetoothTransferIcon = BluetoothTransferIcon;
}(window));
