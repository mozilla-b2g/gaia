/* global BaseIcon */
'use strict';

(function(exports) {
  var BluetoothIcon = function(manager) {
    BaseIcon.call(this, manager);
  };
  BluetoothIcon.prototype = Object.create(BaseIcon.prototype);
  BluetoothIcon.prototype.name = 'BluetoothIcon';
  BluetoothIcon.prototype.update = function() {
    var icon = this.element;
    if (!icon) {
      return;
    }
    // XXX: we should use this.manager.isEnabled,
    // but it is not true even when bluetooth settings is enabled.
    this.manager._settingsEnabled ? this.show() : this.hide();
    icon.dataset.active = this.manager.connected;
    this.updateLabel('bluetooth', this.manager.connected);
  };
  exports.BluetoothIcon = BluetoothIcon;
}(window));
