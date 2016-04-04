'use strict';

// Shim for non FXOS environments
if (!navigator.getDeviceStorage) {
  navigator.getDeviceStorage = function() {};
}

// Load RequireJS and use same config as the app uses
requireApp('camera/bower_components/requirejs/index.js');
requireApp('camera/js/config/require.js');

require('/shared/test/unit/mocks/mocks_helper.js');
