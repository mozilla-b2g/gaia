/* global BaseIcon */
'use strict';

(function(exports) {
  var HeadphoneIcon = function(manager) {
    this.manager = manager;
  };
  HeadphoneIcon.prototype = Object.create(BaseIcon.prototype);
  HeadphoneIcon.prototype.constructor = HeadphoneIcon;
  HeadphoneIcon.prototype.CLASS_LIST = 'sb-icon sb-icon-headphones';
  HeadphoneIcon.prototype.l10nId = 'statusbarHeadphones';
  HeadphoneIcon.prototype.instanceID = 'statusbar-headphones';
  HeadphoneIcon.prototype.update = function() {
    var icon = this.element;
    Service.query('isHeadsetConnected') ? this.show() : this.hide();
  };
  exports.HeadphoneIcon = HeadphoneIcon;
}(window));
