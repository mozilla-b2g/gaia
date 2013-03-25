'use strict';

requireCommon('test/synthetic_gestures.js');
require('/tests/performance/performance_helper.js');
require('apps/settings/test/integration/app.js');

suite(window.mozTestInfo.appPath + ' >', function() {
  var device;
  var app;

  MarionetteHelper.start(function(client) {
    app = new SettingsIntegration(client);
    device = app.device;
  });

  setup(function() {
    // It affects the first run otherwise
    yield IntegrationHelper.unlock(device);
  });

  test('rendering WiFi list >', function() {
    this.timeout(500000);
    yield device.setScriptTimeout(50000);

    var lastEvent = 'settings-panel-wifi-ready';

    var performanceHelper = new PerformanceHelper({
      app: app,
      lastEvent: lastEvent
    });

    yield performanceHelper.repeatWithDelay(function(app, next) {
      var waitForBody = true;
      yield app.launch(waitForBody);

      var wifiSubpanel = yield app.element('wifiSelector');
      yield wifiSubpanel.singleTap();

      var runResults = yield performanceHelper.observe(next);
      performanceHelper.reportRunDurations(runResults);

      yield app.close();
    });

    performanceHelper.finish();

  });
});
