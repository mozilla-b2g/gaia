/* global BaseIcon */
'use strict';

(function(exports) {
  var UsbIcon = function(manager){
    BaseIcon.call(this, manager);
  };
  UsbIcon.prototype = Object.create(BaseIcon.prototype);
  UsbIcon.prototype.name = 'UsbIcon';
  UsbIcon.prototype.shouldDisplay = function() {
    return this.manager.umsActive;
  };
  exports.UsbIcon = UsbIcon;
}(window));
