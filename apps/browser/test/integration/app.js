'use strict';

require('/tests/js/app_integration.js');
require('/tests/js/integration_helper.js');

function BrowserIntegration(device) {
  AppIntegration.apply(this, arguments);
}

BrowserIntegration.prototype = {
  __proto__: AppIntegration.prototype,
  appName: 'Browser',
  manifestURL: 'app://browser.gaiamobile.org/manifest.webapp',

  selectors: {
    query: '#url-input',
    go: '#url-button',
    browserTab: '.browser-tab'
  }
};

