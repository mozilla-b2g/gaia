'use strict';

require('/tests/js/app_integration.js');
require('/tests/js/integration_helper.js');
require('/tests/performance/performance_helper.js');

function GenericIntegration(device) {
  AppIntegration.apply(this, arguments);
}

var foo = window.mozTestInfo.appPath.split('/');
var manifestPath = foo[0];
var entryPoint = foo[1];

GenericIntegration.prototype = {
  __proto__: AppIntegration.prototype,
  appName: window.mozTestInfo.appPath,
  manifestURL: 'app://' + manifestPath + '.gaiamobile.org/manifest.webapp',
  entryPoint: entryPoint
};


suite(window.mozTestInfo.appPath + ' >', function() {
  var device;
  var app;

  MarionetteHelper.start(function(client) {
    app = new GenericIntegration(client);
    device = app.device;
  });

  setup(function() {
    yield IntegrationHelper.unlock(device); // it affects the first run otherwise
    yield PerformanceHelper.registerLoadTimeListener(device);
  });

  teardown(function() {
    yield PerformanceHelper.unregisterLoadTimeListener(device);
  });

  test('startup time', function() {
    // Mocha timeout for this test
    this.timeout(100000);
    // Marionnette timeout for each command sent to the device
    yield device.setScriptTimeout(10000);

    for (var i = 0; i < PerformanceHelper.kRuns; i++) {
      yield IntegrationHelper.delay(device, PerformanceHelper.kSpawnInterval);
      yield app.launch();
      yield app.close();
    }

    var results = yield PerformanceHelper.getLoadTimes(device);

    PerformanceHelper.reportDuration(results);
  });
});
