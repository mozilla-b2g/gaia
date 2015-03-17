'use strict';


var assert = require('assert');
var PerformanceHelper = requireGaia('/tests/performance/performance_helper.js');
var SettingsIntegration = require('./integration.js');

marionette(config.appPath + ' >', function() {
  var app;
  var client = marionette.client();
  // Do nothing on script timeout. Bug 987383
  client.onScriptTimeout = null;

  app = new SettingsIntegration(client, config.appPath);

  setup(function() {
    this.timeout(config.timeout);
    client.setScriptTimeout(config.scriptTimeout);
    PerformanceHelper.injectHelperAtom(client);
  });

  test('rendering WiFi list >', function() {
    var lastEvent = 'settings-panel-wifi-ready';

    var performanceHelper = new PerformanceHelper({
      app: app,
      lastEvent: lastEvent
    });

    performanceHelper.unlockScreen();

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
