/* global System, BaseUI */
'use strict';

(function(exports) {
  var WifiIcon = function(manager) {
    this.manager = manager;
  };
  WifiIcon.prototype = Object.create(BaseUI.prototype);
  WifiIcon.prototype.constructor = WifiIcon;
  WifiIcon.prototype.EVENT_PREFIX = 'wifiicon';
  WifiIcon.prototype.containerElement = document.getElementById('statusbar');
  WifiIcon.prototype.view = function() {
    return '<div id="statusbar-wifi" class="sb-icon sb-icon-wifi" ' +
            'data-level="4" hidden role="listitem"></div>';
  };
  WifiIcon.prototype._fetchElements = function() {
    this.element = document.getElementById('statusbar-wifi');
  };
  WifiIcon.prototype.show = function() {
    var hidden = this.element.hidden;
    if (!hidden) {
      return;
    }
    this.element.hidden = false;
    this.publish('shown');
  };
  WifiIcon.prototype.hide = function() {
    var hidden = this.element.hidden;
    if (hidden) {
      return;
    }
    this.element.hidden = true;
    this.publish('hidden');
  };
  WifiIcon.prototype.start = function() {
    window.addEventListener('wifi-statuschange', this);
    window.addEventListener('wifi-enabled', this);
    window.addEventListener('wifi-disabled', this);
    this.update();
  };
  WifiIcon.prototype.stop = function() {
    window.removeEventListener('wifi-statuschange', this);
    window.removeEventListener('wifi-enabled', this);
    window.removeEventListener('wifi-disabled', this);
  };
  WifiIcon.prototype.setActive = function(active) {
    if (active) {
      var wifiManager = window.navigator.mozWifiManager;
      if (wifiManager) {
        wifiManager.connectionInfoUpdate = this.update.bind(this);
        this.update();
      }
    }
  };
  WifiIcon.prototype.isVisible = function() {
    return this.element && !this.element.hidden;
  };
  WifiIcon.prototype.update = function() {
    var wifiManager = window.navigator.mozWifiManager;
    if (!wifiManager) {
      return;
    }

    var icon = this.element;
    var wasHidden = icon.hidden;

    var enabled = System.query('Wifi.enabled');
    if (!enabled) {
      icon.hidden = true;
      if (!wasHidden) {
        this.publish('hidden');
      }
      return;
    }

    switch (wifiManager.connection.status) {
      case 'disconnected':
        this.hidden();
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

    this.manager._updateIconVisibility();
  };
}(window));
