'use strict';

var App = require(GAIA_DIR + '/tests/performance/app.js');

require(GAIA_DIR + '/test_apps/test-agent/common/test/synthetic_gestures.js');

var PerformanceHelper =
  require(GAIA_DIR + '/tests/performance/performance_helper.js');

function SettingsIntegration(client) {
  App.apply(this, arguments);
}

SettingsIntegration.prototype = {
  __proto__: App.prototype,
  appName: 'Settings',
  manifestURL: 'app://settings.gaiamobile.org/manifest.webapp',

  selectors: {
    wifiSelector: '#menuItem-wifi'
  }
};

suite(mozTestInfo.appPath + ' >', function() {
  var app;
  var client = marionette.client({
    settings: {
      'ftu.manifestURL': null
    }
  });

  app = new SettingsIntegration(client, mozTestInfo.appPath);

  setup(function() {
    // It affects the first run otherwise
    app.unlock();
  });

  test('rendering WiFi list >', function() {
    this.timeout(500000);
    client.setScriptTimeout(50000);

    var lastEvent = 'settings-panel-wifi-ready';

    var performanceHelper = new PerformanceHelper({
      app: app,
      lastEvent: lastEvent
    });

    performanceHelper.repeatWithDelay(function(app, next) {
      var waitForBody = true;
      app.launch(waitForBody);

      var wifiSubpanel = app.element('wifiSelector');
      wifiSubpanel.singleTap();

      var runResults = performanceHelper.observe(next);
      performanceHelper.reportRunDurations(runResults);

      app.close();
    });

    performanceHelper.finish();

  });
});
