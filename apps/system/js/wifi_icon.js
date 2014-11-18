/* global System, BaseUI */
'use strict';

(function(exports) {
  var WifiIcon = function() {};
  WifiIcon.prototype = Object.create(BaseIcon.prototype);
  WifiIcon.prototype.determine = function() {
    return this.manager.enabled;
  };
  WifiIcon.prototype.updateLevel = function() {
    var icon = this.element;
    if (!icon) {
      return;
    }
    switch (this.manager.wifiManager.connection.status) {
      case 'connecting':
      case 'associated':
        icon.dataset.connecting = true;
        icon.dataset.level = 0;
        icon.setAttribute('aria-label', navigator.mozL10n.get(
          'statusbarWiFiConnecting'));
        break;

      case 'connected':
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
  exports.WifiIcon = WifiIcon;
}(window));
