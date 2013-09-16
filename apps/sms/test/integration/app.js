'use strict';

/*global AppIntegration */

require('/tests/js/app_integration.js');
require('/tests/js/integration_helper.js');

function MessagesIntegration(device) {
  AppIntegration.apply(this, arguments);
}

MessagesIntegration.prototype = {
  __proto__: AppIntegration.prototype,
  appName: 'Messages',
  manifestURL: 'app://sms.gaiamobile.org/manifest.webapp'
};
