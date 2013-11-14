'use strict';

requireGaia('/test_apps/test-agent/common/test/synthetic_gestures.js');

var App = requireGaia('/tests/performance/app.js');
var PerformanceHelper =
  requireGaia('/tests/performance/performance_helper.js');

function DialerIntegration(client) {
  App.apply(this, arguments);
}

DialerIntegration.prototype = {
  __proto__: App.prototype,
  appName: 'Phone',
  manifestURL: 'app://communications.gaiamobile.org/manifest.webapp',
  entryPoint: 'dialer',

  selectors: {
    optionRecents: '#option-recents'
  }
};

marionette(mozTestInfo.appPath + '>', function() {
  var client = marionette.client({
    settings: {
      'ftu.manifestURL': null
    }
  });

  var app = new DialerIntegration(client);

  setup(function() {
    app.unlock();
  });

  test('Dialer/callLog rendering time >', function() {

    this.timeout(500000);
    client.setScriptTimeout(50000);

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

      var runResults = performanceHelper.observe();
      performanceHelper.reportRunDurations(runResults);

      app.close();
    });

    performanceHelper.finish();
  });
});
