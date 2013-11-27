'use strict';


var App = require('./app');
var PerformanceHelper = requireGaia('/tests/performance/performance_helper.js');
var MarionetteHelper = requireGaia('/tests/js-marionette/helper.js');

// This test is only for communications/contacts for now.
// XXX extend to more apps.
var whitelistedApps = ['communications/contacts'];
if (whitelistedApps.indexOf(mozTestInfo.appPath) === -1) {
  return;
}

var manifestPath, entryPoint;
var arr = mozTestInfo.appPath.split('/');
manifestPath = arr[0];
entryPoint = arr[1];


marionette('startup event test > ' + mozTestInfo.appPath + ' >', function() {

  var client = marionette.client({
    settings: {
      'ftu.manifestURL': null
    }
  });
  var lastEvent = 'startup-path-done';

  var app = new App(client, mozTestInfo.appPath);
  if (app.skip) {
    return;
  }

  var performanceHelper = new PerformanceHelper({
    app: app,
    lastEvent: lastEvent
  });

  setup(function() {
    // it affects the first run otherwise
    this.timeout(500000);
    client.setScriptTimeout(50000);

    MarionetteHelper.unlockScreen(client);
  });

  test('startup >', function() {

    performanceHelper.repeatWithDelay(function(app, next) {

      var waitForBody = false;
      app.launch(waitForBody);

      performanceHelper.observe();

      performanceHelper.waitForPerfEvent(function(runResults) {
        performanceHelper.reportRunDurations(runResults);
        app.close();
      });
    });

    performanceHelper.finish();

  });

});
