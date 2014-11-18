/* global BaseIcon */
'use strict';

(function(exports) {
  var HeadphonesIcon = function() {};
  HeadphonesIcon.prototype = Object.create(BaseIcon.prototype);
  HeadphonesIcon.prototype.name = 'HeadphoneIcon';
  HeadphonesIcon.prototype.determine = function() {
    return this.manager.isHeadsetConnected;
  };
  exports.HeadphonesIcon = HeadphonesIcon;
}(window));
