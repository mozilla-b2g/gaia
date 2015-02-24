/* global BaseIcon */
'use strict';

(function(exports) {
  var BluetoothHeadphoneIcon = function(manager) {
    BaseIcon.call(this, manager);
  };
  BluetoothHeadphoneIcon.prototype = Object.create(BaseIcon.prototype);
  BluetoothHeadphoneIcon.prototype.name = 'BluetoothHeadphoneIcon';
  BluetoothHeadphoneIcon.prototype.shouldDisplay = function() {
    return this.manager.isProfileConnected(this.manager.Profiles.A2DP);
  };
  exports.BluetoothHeadphoneIcon = BluetoothHeadphoneIcon;
}(window));
