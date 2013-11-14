'use strict';


var App = require('./app');
var PerformanceHelper = requireGaia('/tests/performance/performance_helper.js');

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


marionette('startup event test ' + mozTestInfo.appPath + ' >', function() {

  var app;
  var client = marionette.client({
    settings: {
      'ftu.manifestURL': null
    }
  });

  app = new App(client, mozTestInfo.appPath);
  if (app.skip) {
    return;
  }

  suite(mozTestInfo.appPath + ' >', function() {
    setup(function() {
      // it affects the first run otherwise
    });

    test('startup', function() {

      this.timeout(500000);
      client.setScriptTimeout(50000);

      var lastEvent = 'startup-path-done';

      var performanceHelper = new PerformanceHelper({
        app: app,
        lastEvent: lastEvent
      });

      app.unlock();

      performanceHelper.repeatWithDelay(function(app, next) {

        var waitForBody = false;
        app.launch(waitForBody);

        var runResults = performanceHelper.observe();

        performanceHelper.reportRunDurations(runResults);
        app.close();
      });

      performanceHelper.finish();

    });

  });
});
