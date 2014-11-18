/* global System, BaseUI */
'use strict';

(function(exports) {
  var UsbIcon = function(){};
  UsbIcon.prototype = Object.create(BaseIcon.prototype);
  UsbIcon.prototype.name = 'UsbIcon';
  UsbIcon.prototype.determine = function() {
    return this.manager.umsActive ? this.show() : this.hide();
  };
  exports.UsbIcon = UsbIcon;
}(window));
