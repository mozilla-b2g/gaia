'use strict';

require('/tests/js/app_integration.js');
require('/tests/js/integration_helper.js');

function SettingsIntegration(device) {
  AppIntegration.apply(this, arguments);
}

SettingsIntegration.prototype = {
  __proto__: AppIntegration.prototype,
  appName: 'Settings',
  manifestURL: 'app://settings.gaiamobile.org/manifest.webapp',

  selectors: {
    wifiSelector: '#menuItem-wifi'
  }
};
