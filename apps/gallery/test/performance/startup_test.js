'use strict';

require('/tests/js/performance_helper.js');
require('apps/gallery/test/integration/app.js');

suite('Gallery', function() {
  var device;
  var app;

  MarionetteHelper.start(function(client) {
    app = new GalleryIntegration(client);
    device = app.device;
  });

  setup(function() {
    yield IntegrationHelper.unlock(device); // it affects the first run otherwise
    yield PerformanceHelper.registerLoadTimeListener(device);
  });

  teardown(function() {
    yield PerformanceHelper.unregisterLoadTimeListener(device);
  });

  test('average startup time', function() {
    this.timeout(100000);

    for (var i = 0; i < PerformanceHelper.kRuns; i++) {
      yield IntegrationHelper.delay(device, PerformanceHelper.kSpawnInterval);
      yield app.launch();
      yield app.close();
    }

    var results = yield PerformanceHelper.getLoadTimes(device);

    PerformanceHelper.reportDuration(results);
  });
});
