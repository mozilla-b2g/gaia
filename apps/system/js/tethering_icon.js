/* global Service, BaseIcon */
'use strict';

(function(exports) {
  var TetheringIcon = function() {};
  TetheringIcon.prototype = Object.create(BaseIcon.prototype);
  TetheringIcon.prototype.name = 'TetheringIcon';
  TetheringIcon.prototype.start = function() {
    Service.request('addObserver', 'tethering.usb.enabled', this);
    Service.request('addObserver', 'tethering.wifi.enabled', this);
    Service.request('addObserver', 'tethering.wifi.connectedClients', this);
    Service.request('addObserver', 'tethering.usb.connectedClients', this);
    this.render();
  };
  TetheringIcon.prototype.stop = function() {
    Service.request('removeObserver', 'tethering.usb.enabled', this);
    Service.request('removeObserver', 'tethering.wifi.enabled', this);
    Service.request('removeObserver', 'tethering.wifi.connectedClients', this);
    Service.request('removeObserver', 'tethering.usb.connectedClients', this);
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
    if (!this.element) {
      return;
    }
    icon.hidden = !(this._settings['tethering.usb.enabled'] ||
                    this._settings['tethering.wifi.enabled']);

    icon.dataset.active =
      (this._settings['tethering.wifi.connectedClients'] !== 0) ||
      (this._settings['tethering.usb.connectedClients'] !== 0);

    this.updateIconLabel('tethering', icon.dataset.active);
  };
  exports.TetheringIcon = TetheringIcon;
}(window));
