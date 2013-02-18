'use strict';

require('/tests/performance/performance_helper.js');
require('apps/communications/contacts/test/integration/app.js');

suite('Contacts', function() {
  var device;
  var app;

  MarionetteHelper.start(function(client) {
    app = new ContactsIntegration(client);
    device = app.device;
  });

  setup(function() {
    yield IntegrationHelper.unlock(device); // it affects the first run otherwise
  });

  test('average rendering time', function() {
    this.timeout(100000);

    var firstPaints = [];
    var lastPaints = [];

    for (var i = 0; i < PerformanceHelper.kRuns; i++) {
      yield IntegrationHelper.delay(device, PerformanceHelper.kSpawnInterval);

      var waitForBody = false;
      yield app.launch(waitForBody);

      var results = yield app.observeRendering();
      firstPaints.push(results.first - results.start);
      lastPaints.push(results.last - results.start);

      yield app.close();
    }

    PerformanceHelper.reportDuration(firstPaints, 'first chunk');
    PerformanceHelper.reportDuration(lastPaints, 'last chunk');
  });
});
