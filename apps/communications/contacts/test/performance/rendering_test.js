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
    yield IntegrationHelper.unlock(device); //it affects the first run otherwise
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

