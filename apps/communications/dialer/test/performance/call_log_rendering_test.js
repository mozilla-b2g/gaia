'use strict';

var assert = require('assert');

requireGaia('/dev_apps/test-agent/common/test/synthetic_gestures.js');
var MarionetteHelper = requireGaia('/tests/js-marionette/helper.js');

var PerformanceHelper =
  requireGaia('/tests/performance/performance_helper.js');
var DialerIntegration = require('./integration.js');

marionette(mozTestInfo.appPath + ' >', function() {
  var client = marionette.client({
    settings: {
      'ftu.manifestURL': null
    }
  });
  // Do nothing on script timeout. Bug 987383
  client.onScriptTimeout = null;

  setup(function() {
    this.timeout(500000);
    client.setScriptTimeout(50000);

    // inject perf event listener
    PerformanceHelper.injectHelperAtom(client);

    MarionetteHelper.unlockScreen(client);
  });

  test('Dialer/callLog rendering time >', function() {
    var app = new DialerIntegration(client);


    var lastEvent = 'call-log-ready';

    var performanceHelper = new PerformanceHelper({
      app: app,
      lastEvent: lastEvent
    });

    performanceHelper.repeatWithDelay(function(app, next) {
      var waitForBody = true;
      app.launch(waitForBody);

      app.element('optionRecents', function(err, recentsButton) {
        recentsButton.tap();
      });

      performanceHelper.waitForPerfEvent(function(runResults, error) {
        if (error) {
          app.close();
          throw error;
        } else {
          performanceHelper.reportRunDurations(runResults, 'start-call-log');

          assert.ok(Object.keys(runResults).length, 'empty results');
          app.close();
        }
      });

    });

    performanceHelper.finish();
  });
});
