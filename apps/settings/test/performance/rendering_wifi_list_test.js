'use strict';


var assert = require('assert');

var MarionetteHelper = requireGaia('/tests/js-marionette/helper.js');

var PerformanceHelper =
  requireGaia('/tests/performance/performance_helper.js');
var SettingsIntegration = require('./integration.js');

marionette(config.appPath + ' >', function() {
  var app;
  var client = marionette.client({
    settings: {
      'ftu.manifestURL': null
    }
  });
  // Do nothing on script timeout. Bug 987383
  client.onScriptTimeout = null;

  app = new SettingsIntegration(client, config.appPath);

  setup(function() {
    // It affects the first run otherwise
    this.timeout(config.timeout);
    client.setScriptTimeout(config.scriptTimeout);

    // inject perf event listener
    PerformanceHelper.injectHelperAtom(client);

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

      app.element('wifiSelector', function(err, wifiSubpanel) {
        client.waitFor(function() {
          return wifiSubpanel.enabled;
        });
        wifiSubpanel.tap();
      });

      performanceHelper.waitForPerfEvent(function(runResults, error) {
        if (error) {
          app.close();
          throw error;
        } else {
          performanceHelper.reportRunDurations(runResults,
                                              'start-wifi-list-test');
          assert.ok(Object.keys(runResults).length, 'empty results');
          app.close();
        }
      });
    });

    performanceHelper.finish();

  });
});
