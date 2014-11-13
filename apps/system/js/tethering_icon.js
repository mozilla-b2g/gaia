/* global System, BaseUI */
'use strict';

(function(exports) {
  var TetheringIcon = function(manager) {
    this.manager = manager;
  };
  TetheringIcon.prototype = Object.create(BaseUI.prototype);
  TetheringIcon.prototype.constructor = TetheringIcon;
  TetheringIcon.prototype.EVENT_PREFIX = 'TetheringIcon';
  TetheringIcon.prototype.containerElement = document.getElementById('statusbar');
  TetheringIcon.prototype.view = function() {
    return '<div id="statusbar-tethering" class="sb-icon sb-icon-tethering" hidden role="listitem">' +
          '</div>';
  };
  TetheringIcon.prototype.instanceID = 'statusbar-tethering';
  TetheringIcon.prototype._fetchElements = function() {
    this.element = document.getElementById(this.instanceID);
  };
  TetheringIcon.prototype.show = function() {
    var hidden = this.element.hidden;
    if (!hidden) {
      return;
    }
    this.element.hidden = false;
    this.publish('shown');
  };
  TetheringIcon.prototype.hide = function() {
    var hidden = this.element.hidden;
    if (hidden) {
      return;
    }
    this.element.hidden = true;
    this.publish('hidden');
  };
  TetheringIcon.prototype.start = function() {
    System.request('addObserver', 'tethering.usb.enabled', this);
    System.request('addObserver', 'tethering.wifi.enabled', this);
    System.request('addObserver', 'tethering.wifi.connectedClients', this);
    System.request('addObserver', 'tethering.usb.connectedClients', this);
  };
  TetheringIcon.prototype.stop = function() {
    System.request('removeObserver', 'tethering.usb.enabled', this);
    System.request('removeObserver', 'tethering.wifi.enabled', this);
    System.request('removeObserver', 'tethering.wifi.connectedClients', this);
    System.request('removeObserver', 'tethering.usb.connectedClients', this);
  };
  TetheringIcon.prototype.isVisible = function() {
    return this.element && !this.element.hidden;
  };
  TetheringIcon.prototype.observe = function(key, value) {
    this._settings[key] = value;
    this.update();
  };
  TetheringIcon.prototype.updateIconLabel = function(type, active) {
    if (this.element.hidden) {
      return;
    }
    this.element.setAttribute('aria-label', navigator.mozL10n.get((active ?
      'statusbarIconOnActive-' : 'statusbarIconOn-') + type));
  };
  TetheringIcon.prototype.update = function() {
    var icon = this.element;
    icon.hidden = !(this._settings['tethering.usb.enabled'] ||
                    this._settings['tethering.wifi.enabled']);

    icon.dataset.active =
      (this._settings['tethering.wifi.connectedClients'] !== 0) ||
      (this._settings['tethering.usb.connectedClients'] !== 0);

    this.updateIconLabel('tethering', icon.dataset.active);

    this.manager._updateIconVisibility();
  };
  exports.TetheringIcon = TetheringIcon;
}(window));
