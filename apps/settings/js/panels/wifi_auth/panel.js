define(function(require) {
  'use strict';

  var DialogPanel = require('modules/dialog_panel');
  var WifiUtils = require('modules/wifi_utils');

  return function ctor_wifiAuth() {
    var elements = {};

    return DialogPanel({
      onInit: function(panel, options) {
        elements.ssid = panel.querySelector('[data-ssid]');
        elements.signal = panel.querySelector('[data-signal]');
        elements.security = panel.querySelector('[data-security]');
        elements.identity = panel.querySelector('input[name=identity]');
        elements.password = panel.querySelector('input[name=password]');
        elements.showPassword = panel.querySelector('input[name=show-pwd]');
        elements.eap = panel.querySelector('li.eap select');
        elements.authPhase2 = panel.querySelector('li.auth-phase2 select');
        elements.userCertificate =
          panel.querySelector('li.user-certificate select');
        elements.serverCertificate =
          panel.querySelector('li.server-certificate select');
      },
      onBeforeShow: function(panel, options) {
        var network = options.network;
        var security = options.security;

        panel.dataset.security = security;
        WifiUtils.initializeAuthFields(panel, network);

        elements.ssid.textContent = network.ssid;
        elements.signal.setAttribute('data-l10n-id',
          'signalLevel' + options.sl);

        if (options.security) {
          elements.security.removeAttribute('data-l10n-id');
          elements.security.textContent = options.security;
        } else {
          elements.security.setAttribute('data-l10n-id', 'securityNone');
        }
      },
      onHide: function() {
        elements.identity.value = '';
        elements.password.value = '';
        elements.showPassword.checked = false;
      },
      onSubmit: function() {
        // TODO
        // add user certificate back to caller
        return Promise.resolve({
          password: elements.password.value,
          identity: elements.identity.value,
          eap: elements.eap.value,
          authPhase2: elements.authPhase2.value,
          userCertificate: elements.userCertificate.value,
          serverCertificate: elements.serverCertificate.value
        });
      }
    });
  };
});
