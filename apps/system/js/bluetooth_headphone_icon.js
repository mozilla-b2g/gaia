/* global BaseIcon */
'use strict';

(function(exports) {
  var BluetoothHeadphoneIcon = function(manager) {
    BaseIcon.call(this, manager);
  };
  BluetoothHeadphoneIcon.prototype = Object.create(BaseIcon.prototype);
  BluetoothHeadphoneIcon.prototype.name = 'BluetoothHeadphoneIcon';
  BluetoothHeadphoneIcon.prototype.shouldDisplay = function() {
    return this.manager.isA2DPProfileConnected;
  };

  BluetoothHeadphoneIcon.prototype.view = function view() {
    return `<div id="statusbar-bluetooth-headphone"
              class="sb-icon sb-icon-bluetooth-headphone"
              role="listitem" hidden
              data-l10n-id="statusbarBluetoothHeadphone">
            </div>`;
  };

  exports.BluetoothHeadphoneIcon = BluetoothHeadphoneIcon;
}(window));
