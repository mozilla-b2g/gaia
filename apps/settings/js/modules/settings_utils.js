define(function(require) {
  'use strict';

  // TODO
  // We need to move utils.js to SettingsUtils step by step
  var SettingsService = require('modules/settings_service');
  var SettingsUtils = {
    openDialog: function(dialogID, userOptions) {
      if ('#' + dialogID == Settings.currentPanel) {
        return;
      }

      var origin = Settings.currentPanel.match(/#(.*)/)[1];
      var options = userOptions || {};
      var onSubmit = options.onSubmit || function() {};
      var onReset = options.onReset || function() {};

      // Don't bypass these two functions inside panel
      delete options.onSubmit;
      delete options.onReset;

      // Load dialog contents and show it.
      SettingsService.navigate(dialogID, options);

      var dialog = document.getElementById(dialogID);
      var submit = dialog.querySelector('[type=submit]');
      if (submit) {
        submit.onclick = function onsubmit() {
          if (typeof onSubmit === 'function') {
            (onSubmit.bind(dialog))();
          }
          // hide dialog box
          SettingsService.navigate(origin);
        };
      }

      var reset = dialog.querySelector('[type=reset]');
      if (reset) {
        reset.onclick = function onreset() {
          if (typeof onReset === 'function') {
            (onReset.bind(dialog))();
          }
          // hide dialog box
          SettingsService.navigate(origin);
        };
      }
    },

    // change element display
    changeDisplay: function(dialogID, security) {
      var dialog = document.getElementById(dialogID);
      var eap = dialog.querySelector('li.eap select');
      var identity = dialog.querySelector('input[name=identity]');
      var password = dialog.querySelector('input[name=password]');
      var authPhase2 = dialog.querySelector('li.auth-phase2 select');
      var certificate = dialog.querySelector('li.server-certificate select');
      var description =
        dialog.querySelector('li.server-certificate-description');

      if (dialogID !== 'wifi-status') {
        if (security === 'WEP' || security === 'WPA-PSK') {
          identity.parentNode.style.display = 'none';
          password.parentNode.style.display = 'block';
          authPhase2.parentNode.parentNode.style.display = 'none';
          certificate.parentNode.parentNode.style.display = 'none';
          description.style.display = 'none';
        } else if (security === 'WPA-EAP') {
          if (eap) {
            switch (eap.value) {
              case 'SIM':
                identity.parentNode.style.display = 'none';
                password.parentNode.style.display = 'none';
                authPhase2.parentNode.parentNode.style.display = 'none';
                certificate.parentNode.parentNode.style.display = 'none';
                description.style.display = 'none';
                break;
              case 'PEAP':
              case 'TLS':
              case 'TTLS':
                identity.parentNode.style.display = 'block';
                password.parentNode.style.display = 'block';
                authPhase2.parentNode.parentNode.style.display = 'block';
                certificate.parentNode.parentNode.style.display = 'block';
                description.style.display = 'block';
                break;
              default:
                break;
            }
          }
        } else {
          identity.parentNode.style.display = 'none';
          password.parentNode.style.display = 'none';
        }
      }
    }
  };

  return SettingsUtils;
});
