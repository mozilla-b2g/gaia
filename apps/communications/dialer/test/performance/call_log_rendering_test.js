'use strict';

requireGaia('/test_apps/test-agent/common/test/synthetic_gestures.js');
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

  setup(function() {
    this.timeout(500000);
    client.setScriptTimeout(50000);

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

      performanceHelper.observe();

      app.element('optionRecents', function(err, recentsButton) {
        recentsButton.tap();
      });

      performanceHelper.waitForPerfEvent(function(runResults) {
        performanceHelper.reportRunDurations(runResults);

        app.close();
      });

    });

    performanceHelper.finish();
  });
});
