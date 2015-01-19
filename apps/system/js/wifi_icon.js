/* global BaseIcon */
'use strict';

(function(exports) {
  var WifiIcon = function(manager) {
    BaseIcon.call(this, manager);
  };
  WifiIcon.prototype = Object.create(BaseIcon.prototype);
  WifiIcon.prototype.name = 'WifiIcon';
  WifiIcon.prototype.update = function() {
    var icon = this.element;
    if (!icon || !this.enabled()) {
      return;
    }
    switch (this.manager.wifiManager.connection.status) {
      case 'disconnected':
        this.hide();
        break;

      case 'connecting':
      case 'associated':
        this.show();
        icon.dataset.connecting = true;
        icon.dataset.level = 0;
        navigator.mozL10n.setAttributes(icon, 'statusbarWiFiConnecting');
        break;

      case 'connected':
        this.show();
        if (icon.dataset.connecting) {
          delete icon.dataset.connecting;
        }
        var level = Math.floor(
          this.manager.wifiManager
              .connectionInformation.relSignalStrength / 25);
        icon.dataset.level = level;
        navigator.mozL10n.setAttributes(icon, 'statusbarWiFiConnected',
          {level: level});
        break;
    }
  };
  exports.WifiIcon = WifiIcon;
}(window));
