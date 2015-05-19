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
    this.manager.isEnabled ? this.show() : this.hide();
    icon.dataset.active = this.manager.connected;
    this.updateLabel('bluetooth', this.manager.connected);
  };

  BluetoothIcon.prototype.view = function view() {
    return `<div id="statusbar-bluetooth"
              class="sb-icon sb-icon-bluetooth" hidden
              role="listitem">
            </div>`;
  };

  exports.BluetoothIcon = BluetoothIcon;
}(window));
