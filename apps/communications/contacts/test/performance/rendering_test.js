'use strict';

require('/tests/performance/performance_helper.js');
require('apps/communications/contacts/test/integration/app.js');

suite(window.mozTestInfo.appPath + ' >', function() {
  var device;
  var app;

  MarionetteHelper.start(function(client) {
    app = new ContactsIntegration(client);
    device = app.device;
  });

  setup(function() {
    // it affects the first run otherwise
    yield IntegrationHelper.unlock(device);
  });

  test('rendering time >', function() {
    this.timeout(500000);
    yield device.setScriptTimeout(50000);

    var lastEvent = 'contacts-last-chunk';
    var eventTitles = {
      'contacts-first-chunk': 'first chunk',
      'contacts-last-chunk': 'last chunk',
      'contacts-list-init-finished': 'init finished'
    };

    var performanceHelper = new PerformanceHelper({
      app: app,
      eventTitles: eventTitles,
      lastEvent: lastEvent
    });

    // FIXME When Bug 846302 lands, the loop will be handled by
    // performanceHelper instead.
    for (var i = 0; i < performanceHelper.runs; i++) {

      yield performanceHelper.delay();

      var waitForBody = false;
      yield app.launch(waitForBody);

      var runResults = yield performanceHelper.observe();

      performanceHelper.reportRunDurations(runResults);
      yield app.close();
    }

    performanceHelper.finish();

  });
});

