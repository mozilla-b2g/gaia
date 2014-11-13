/* global System, BaseUI */
'use strict';

(function(exports) {
  var BluetoothIcon = function(manager) {
    this.manager = manager;
  };
  BluetoothIcon.prototype = Object.create(BaseUI.prototype);
  BluetoothIcon.prototype.constructor = BluetoothIcon;
  BluetoothIcon.prototype.EVENT_PREFIX = 'BluetoothIcon';
  BluetoothIcon.prototype.containerElement = document.getElementById('statusbar');
  BluetoothIcon.prototype.view = function() {
    return '<div id="' + this.instanceID + '" class="sb-icon sb-icon-bluetooth" hidden ' +
            'role="listitem"></div>'
  };
  BluetoothIcon.prototype.instanceID = 'statusbar-bluetooth';
  BluetoothIcon.prototype._fetchElements = function() {
    this.element = document.getElementById(this.instanceID);
  };
  BluetoothIcon.prototype.show = function() {
    var hidden = this.element.hidden;
    if (!hidden) {
      return;
    }
    this.element.hidden = false;
    this.publish('shown');
  };
  BluetoothIcon.prototype.hide = function() {
    var hidden = this.element.hidden;
    if (hidden) {
      return;
    }
    this.element.hidden = true;
    this.publish('hidden');
  };
  BluetoothIcon.prototype.start = function() {
    window.addEventListener('bluetoothconnectionchange', this);
  };
  BluetoothIcon.prototype.stop = function() {
    window.removeEventListener('bluetoothconnectionchange', this);
  };
  BluetoothIcon.prototype.handleEvent = function() {
    this.update();
  };
  BluetoothIcon.prototype.isVisible = function() {
    return this.element && !this.element.hidden;
  };
  BluetoothIcon.prototype.update = function() {
    var icon = this.element;

    icon.hidden = !System.query('Bluetooth.enabled');
    icon.dataset.active = System.query('Bluetooth.connected');
    this.updateIconLabel(icon, 'bluetooth', icon.dataset.active);

    this.manager._updateIconVisibility();
  };
  exports.BluetoothIcon = BluetoothIcon;
}(window));
