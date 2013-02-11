'use strict';

require('/tests/js/app_integration.js');
require('/tests/js/integration_helper.js');

function GalleryIntegration(device) {
  AppIntegration.apply(this, arguments);
}

GalleryIntegration.prototype = {
  __proto__: AppIntegration.prototype,
  appName: 'Gallery',
  manifestURL: 'app://gallery.gaiamobile.org/manifest.webapp'
};
