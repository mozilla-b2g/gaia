'use strict';


var assert = require('assert');

var MarionetteHelper = requireGaia('/tests/js-marionette/helper.js');

var PerformanceHelper =
  requireGaia('/tests/performance/performance_helper.js');
var SettingsIntegration = require('./integration.js');

marionette(mozTestInfo.appPath + ' >', function() {
  var app;
  var client = marionette.client({
    settings: {
      'ftu.manifestURL': null
    }
  });

  app = new SettingsIntegration(client, mozTestInfo.appPath);

  setup(function() {
    // It affects the first run otherwise
    this.timeout(500000);
    client.setScriptTimeout(50000);
    MarionetteHelper.unlockScreen(client);
  });

  test('rendering WiFi list >', function() {
    var lastEvent = 'settings-panel-wifi-ready';

    var performanceHelper = new PerformanceHelper({
      app: app,
      lastEvent: lastEvent
    });

    performanceHelper.repeatWithDelay(function(app, next) {
      var waitForBody = true;
      app.launch(waitForBody);

      performanceHelper.observe();

      app.element('wifiSelector', function(err, wifiSubpanel) {
        wifiSubpanel.tap();
      });

      performanceHelper.waitForPerfEvent(function(runResults) {
        performanceHelper.reportRunDurations(runResults);
        assert.ok(Object.keys(runResults).length, 'empty results');
        app.close();
      });
    });

    performanceHelper.finish();

  });
});
