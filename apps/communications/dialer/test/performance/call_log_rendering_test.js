'use strict';

require(GAIA_DIR + '/test_apps/test-agent/common/test/synthetic_gestures.js');

var App =
  require(GAIA_DIR + '/tests/performance/app.js');
var PerformanceHelper =
  require(GAIA_DIR + '/tests/performance/performance_helper.js');

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

suite(mozTestInfo.appPath + '>', function() {
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

      var recentsButton = app.element('optionRecents');

      recentsButton.singleTap();

      var runResults = performanceHelper.observe(next);
      performanceHelper.reportRunDurations(runResults);

      app.close();
    });

    performanceHelper.finish();
  });
});
