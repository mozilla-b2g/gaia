'use strict';

require('/tests/js/app_integration.js');
require('/tests/js/integration_helper.js');
require('/tests/performance/performance_helper.js');

const whitelistedApps = ['communications/contacts'];

function GenericIntegration(device) {
  AppIntegration.apply(this, arguments);
}

var [manifestPath, entryPoint] = window.mozTestInfo.appPath.split('/');

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
    // it affects the first run otherwise
    yield IntegrationHelper.unlock(device);
  });

  if (whitelistedApps.indexOf(window.mozTestInfo.appPath) === -1) {
    return;
  }

  test('', function() {

    this.timeout(500000);
    yield device.setScriptTimeout(50000);

    var lastEvent = 'startup-path-done';

    var performanceHelper = new PerformanceHelper({
      app: app,
      lastEvent: lastEvent
    });

    yield performanceHelper.repeatWithDelay(function(app, next) {

      var waitForBody = false;
      yield app.launch(waitForBody);

      var runResults = yield performanceHelper.observe(next);

      performanceHelper.reportRunDurations(runResults);
      yield app.close();
    });

    performanceHelper.finish();

  });

});

