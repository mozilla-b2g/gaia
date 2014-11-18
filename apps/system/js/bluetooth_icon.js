/* global BaseIcon */
'use strict';

(function(exports) {
  var BluetoothIcon = function() {};
  BluetoothIcon.prototype = Object.create(BaseIcon.prototype);
  BluetoothIcon.prototype.name = 'BluetoothIcon';
  BluetoothIcon.prototype.update = function() {
    var icon = this.element;
    if (!icon || !this.enabled()) {
      return;
    }
    this.manager.enabled ? this.show() : this.hide();
    icon.dataset.active = this.manager.connected;
    this.updateIconLabel('bluetooth', icon.dataset.active);
  };
  exports.BluetoothIcon = BluetoothIcon;
}(window));
