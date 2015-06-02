/* global BaseIcon */
'use strict';

(function(exports) {
  var BluetoothTransferIcon = function(manager) {
    BaseIcon.call(this, manager);
  };
  BluetoothTransferIcon.prototype = Object.create(BaseIcon.prototype);
  BluetoothTransferIcon.prototype.name = 'BluetoothTransferIcon';
  BluetoothTransferIcon.prototype.shouldDisplay = function() {
    return this.manager.isOPPProfileConnected;
  };

  BluetoothTransferIcon.prototype.view = function view() {
    return `<div id="statusbar-bluetooth-transfer"
              class="sb-icon sb-icon-bluetooth-transfer"
              role="listitem" hidden
              data-l10n-id="statusbarBluetoothTransfer">
            </div>`;
  };

  exports.BluetoothTransferIcon = BluetoothTransferIcon;
}(window));
