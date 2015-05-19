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
    var previousLevel = parseInt(icon.dataset.level, 10);
    var previousConnecting = (icon.dataset.connecting === 'true');
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
        if (!previousConnecting) {
          this.publish('changed');
        }
        break;

      case 'connected':
        var level = Math.min(Math.floor(
          this.manager.wifiManager
              .connectionInformation.relSignalStrength / 20), 4);
        this.show();
        if (icon.dataset.connecting) {
          delete icon.dataset.connecting;
        }
        icon.dataset.level = level;
        navigator.mozL10n.setAttributes(icon, 'statusbarWiFiConnected',
          {level: level});
        if (level !== previousLevel || previousConnecting) {
          this.publish('changed');
        }
        break;
    }
  };

  WifiIcon.prototype.view = function view() {
    return `<div id="statusbar-wifi"
              class="sb-icon sb-icon-wifi"
              data-level="4" hidden
              role="listitem">
            </div>`;
  };

  exports.WifiIcon = WifiIcon;
}(window));
