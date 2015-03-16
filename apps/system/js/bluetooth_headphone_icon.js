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
  exports.BluetoothHeadphoneIcon = BluetoothHeadphoneIcon;
}(window));
