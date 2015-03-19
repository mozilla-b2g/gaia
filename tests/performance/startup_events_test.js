'use strict';

var assert = require('assert');
var App = require('./app');
var PerformanceHelper = requireGaia('/tests/performance/performance_helper.js');
var perfUtils = require('./perf-utils');
var appPath = config.appPath;

if (!perfUtils.isWhitelisted(config.whitelists.mozLaunch, appPath)) {
  return;
}

// XXX This test currently only functions correctly on actual devices
// because of the memory tests. This check should be removed once we can
// support checking memory on simulated devices
if (!perfUtils.isDeviceHost()) {
  return;
}

marionette('startup event test > ' + appPath + ' >', function() {

  var client = marionette.client({
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false
    }
  });
  var app = new App(client, appPath);

  // Do nothing on script timeout. Bug 987383
  client.onScriptTimeout = null;

  if (app.skip) {
    return;
  }

  var performanceHelper = new PerformanceHelper({
    app: app,
    lastEvent: 'moz-app-loaded'
  });

  setup(function() {
    this.timeout(config.timeout);
    client.setScriptTimeout(config.scriptTimeout);
    PerformanceHelper.injectHelperAtom(client);
    performanceHelper.unlockScreen();
  });

  test('startup >', function() {

    var goals = PerformanceHelper.getGoalData(client);
    var memoryResults = [];

    performanceHelper.repeatWithDelay(function(app, next) {
      var waitForBody = false;
      PerformanceHelper.registerTimestamp(client);
      app.launch(waitForBody);

      performanceHelper.waitForPerfEvent(function(runResults, error) {
        if (error) {
          app.close();
          throw error;
        }

        var memoryUsage = performanceHelper.getMemoryUsage(app);
        runResults.start = +PerformanceHelper.getEpochStart(client);

        app.close();

        assert.ok(Object.keys(runResults).length, 'empty results');
        assert.ok(runResults.start > 0, 'problem capturing start epoch');

        memoryResults.push(memoryUsage);
        performanceHelper.reportRunDurations(runResults);
      });
    });

    PerformanceHelper.reportDuration([], 'memory');
    PerformanceHelper.reportMemory(memoryResults, 'memory');
    performanceHelper.finish();
    PerformanceHelper.reportGoal(goals);
  });
});
