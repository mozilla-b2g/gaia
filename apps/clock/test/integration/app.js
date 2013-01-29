'use strict';

require('/tests/js/app_integration.js');
require('/tests/js/integration_helper.js');

function ClockIntegration(device) {
  AppIntegration.apply(this, arguments);
}

ClockIntegration.prototype = {
  __proto__: AppIntegration.prototype,
  appName: 'Clock',
  manifestURL: 'app://clock.gaiamobile.org/manifest.webapp'
};
