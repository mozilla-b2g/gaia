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

  UsbIcon.prototype.view = function view() {
    return `<div id="statusbar-usb"
              class="sb-icon sb-icon-usb"
              hidden role="listitem"
              data-l10n-id="statusbarUsb">
            </div>`;
  };

  exports.UsbIcon = UsbIcon;
}(window));
