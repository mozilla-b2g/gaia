/* global System, BaseUI */
'use strict';

(function(exports) {
  var UsbIcon = function(manager) {
    this.manager = manager;
  };
  UsbIcon.prototype = Object.create(BaseUI.prototype);
  UsbIcon.prototype.constructor = UsbIcon;
  UsbIcon.prototype.EVENT_PREFIX = 'UsbIcon';
  UsbIcon.prototype.containerElement = document.getElementById('statusbar');
  UsbIcon.prototype.view = function() {
    return '<div id="' + this.instanceID + '" class="sb-icon sb-icon-usb" hidden ' +
            'role="listitem" data-l10n-id="statusbarUsb"></div>';
  };
  UsbIcon.prototype.instanceID = 'statusbar-usb';
  UsbIcon.prototype._fetchElements = function() {
    this.element = document.getElementById(this.instanceID);
  };
  UsbIcon.prototype.show = function() {
    var hidden = this.element.hidden;
    if (!hidden) {
      return;
    }
    this.element.hidden = false;
    this.publish('shown');
  };
  UsbIcon.prototype.hide = function() {
    var hidden = this.element.hidden;
    if (hidden) {
      return;
    }
    this.element.hidden = true;
    this.publish('hidden');
  };
  UsbIcon.prototype.start = function() {
    window.addEventListener('mozChromeEvent', this);
  };
  UsbIcon.prototype.stop = function() {
    window.removeEventListener('mozChromeEvent', this);
  };
  UsbIcon.prototype.isVisible = function() {
    return this.element && !this.element.hidden;
  };
  UsbIcon.prototype.handleEvent = function() {
    switch (evt.detail.type) {
      case 'volume-state-changed':
        this.umsActive = evt.detail.active;
        this.update();
        break;
    }
  };
  UsbIcon.prototype.update = function() {
    var icon = this.element;
    this.umsActive ? this.show() : this.hide();
    this.manager._updateIconVisibility();
  };
  exports.UsbIcon = UsbIcon;
}(window));
