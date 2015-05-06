/* global BaseIcon */
'use strict';

(function(exports) {
  var HeadphoneIcon = function(manager) {
    BaseIcon.call(this, manager);
  };
  HeadphoneIcon.prototype = Object.create(BaseIcon.prototype);
  HeadphoneIcon.prototype.name = 'HeadphoneIcon';
  HeadphoneIcon.prototype.shouldDisplay = function() {
    return this.manager.isHeadsetConnected;
  };
  exports.HeadphoneIcon = HeadphoneIcon;
}(window));
