/* global BaseIcon */
'use strict';

(function(exports) {
  var BluetoothHeadphonesIcon = function() {};
  BluetoothHeadphonesIcon.prototype = Object.create(BaseIcon.prototype);
  BluetoothHeadphonesIcon.prototype.name = 'BluetoothHeadphonesIcon';
  BluetoothHeadphonesIcon.prototype.determince = function() {
    return this.manager.isProfileConnected(this.manager.Profiles.A2DP);
  };
  exports.BluetoothHeadphoneIcon = BluetoothHeadphoneIcon;
}(window));
