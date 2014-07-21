define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var WifiUtils = require('modules/wifi_utils');
  var WifiContext = require('modules/wifi_context');
  var _ = navigator.mozL10n.get;

  return function ctor_wifiAuth() {
    var elements = {};

    return SettingsPanel({
      onInit: function(panel, options) {
        elements.ssid = panel.querySelector('[data-ssid]');
        elements.signal = panel.querySelector('[data-signal]');
        elements.security = panel.querySelector('[data-security]');
        elements.identity = panel.querySelector('input[name=identity]');
        elements.password = panel.querySelector('input[name=password]');
        elements.showPassword = panel.querySelector('input[name=show-pwd]');
        elements.eap = panel.querySelector('li.eap select');
        elements.authPhase2 = panel.querySelector('li.auth-phase2 select');
        elements.certificate =
          panel.querySelector('li.server-certificate select');
      },
      onBeforeShow: function(panel, options) {
        var network = options.network;
        WifiUtils.initializeAuthFields(panel, network);
        WifiUtils.changeDisplay(panel, options.security);

        panel.dataset.security = options.security;
        elements.ssid.textContent = network.ssid;
        elements.signal.textContent = _('signalLevel' + options.sl);
        elements.security.textContent = options.security || _('securityNone');
      },
      onBeforeHide: function() {
        WifiContext.authOptions.password = elements.password.value;
        WifiContext.authOptions.identity = elements.identity.value;
        WifiContext.authOptions.eap = elements.eap.value;
        WifiContext.authOptions.authPhase2 = elements.authPhase2.value;
        WifiContext.authOptions.certificate = elements.certificate.value;
      },
      onHide: function() {
        elements.identity.value = '';
        elements.password.value = '';
        elements.showPassword.checked = false;
      }
    });
  };
});
