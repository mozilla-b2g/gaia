/* global System, BaseUI */
'use strict';

(function(exports) {
  var WifiIcon = function(manager) {
    this.manager = manager;
    this.wifiManager = window.navigator.mozWifiManager;
  };
  WifiIcon.prototype = Object.create(BaseIcon.prototype);
  WifiIcon.prototype.constructor = WifiIcon;
  WifiIcon.prototype.view = function() {
    return '<div id="' + this.instanceID + '" class="sb-icon sb-icon-wifi" ' +
            'data-level="4" hidden role="listitem"></div>';
  };
  WifiIcon.prototype.instanceID = 'statusbar-wifi';
  WifiIcon.prototype.start = function() {
    window.addEventListener('wifi-statuschange', this);
    window.addEventListener('wifi-enabled', this);
    window.addEventListener('wifi-disabled', this);
    var wifiManager = 
    if (this.wifiManager) {
      this.wifiManager.connectionInfoUpdate = this.update.bind(this);
    }
    this.update();
  };
  WifiIcon.prototype.stop = function() {
    window.removeEventListener('wifi-statuschange', this);
    window.removeEventListener('wifi-enabled', this);
    window.removeEventListener('wifi-disabled', this);
  };
  WifiIcon.prototype.update = function() {
    if (!this.wifiManager) {
      return;
    }

    var icon = this.element;
    var wasHidden = icon.hidden;

    var enabled = Service.query('Wifi.enabled');
    if (!enabled) {
      this.hide();
      return;
    }

    switch (this.wifiManager.connection.status) {
      case 'disconnected':
        this.hide();
        break;

      case 'connecting':
      case 'associated':
        this.show();
        icon.dataset.connecting = true;
        icon.dataset.level = 0;
        icon.setAttribute('aria-label', navigator.mozL10n.get(
          'statusbarWiFiConnecting'));
        break;

      case 'connected':
        this.show();

        if (icon.dataset.connecting) {
          delete icon.dataset.connecting;
        }
        var level = Math.floor(
          wifiManager.connectionInformation.relSignalStrength / 25);
        icon.dataset.level = level;
        icon.setAttribute('aria-label', navigator.mozL10n.get(
          'statusbarWiFiConnected', {level: level}));
        break;
    }
  };
}(window));
