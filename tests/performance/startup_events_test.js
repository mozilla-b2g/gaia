'use strict';

var assert = require('assert');
var App = require('./app');
var PerformanceHelper = requireGaia('/tests/performance/performance_helper.js');
var MarionetteHelper = requireGaia('/tests/js-marionette/helper.js');
var perfUtils = require('./perf-utils');
var appPath = config.appPath;

if (!perfUtils.isWhitelisted(config.whitelists.mozLaunch, appPath)) {
  return;
}

marionette('startup event test > ' + appPath + ' >', function() {

  var client = marionette.client({
    settings: {
      'ftu.manifestURL': null
    }
  });
  // Do nothing on script timeout. Bug 987383
  client.onScriptTimeout = null;

  var isHostRunner = (config.runnerHost === 'marionette-device-host');
  var lastEvent = 'moz-app-loaded';
  var app = new App(client, appPath);

  if (app.skip) {
    return;
  }

  var performanceHelper = new PerformanceHelper({
    app: app,
    lastEvent: lastEvent
  });

  setup(function() {
    // it affects the first run otherwise
    this.timeout(config.timeout);
    client.setScriptTimeout(config.scriptTimeout);

    // inject perf event listener
    PerformanceHelper.injectHelperAtom(client);

    MarionetteHelper.unlockScreen(client);
  });

  test('startup >', function() {

    var goals = PerformanceHelper.getGoalData(client);
    var memStats = [];
    var memResults = [];

    performanceHelper.repeatWithDelay(function(app, next) {
      var waitForBody = false;
      PerformanceHelper.registerTimestamp(client);
      app.launch(waitForBody);

      performanceHelper.waitForPerfEvent(function(runResults, error) {
        if (error) {
          app.close();
          throw error;
        }

        var epochEnd = PerformanceHelper.getEpochEnd(client);
        var epochStart = PerformanceHelper.getEpochStart(client);
        var delta = epochEnd - epochStart;

        // Bug 1045076: Sanity check. If for some reason any handlers
        // didn't register or we didn't get valid timestamps back, do not
        // report the values for this run and continue on
        if (!epochEnd || !epochStart || delta < 1) {
          return app.close();
        }

        if (isHostRunner) {
          // we can only collect memory if we have a host device (adb)
          var memUsage = performanceHelper.getMemoryUsage(app);
          var start = runResults.start || 0;
          app.close();
          assert.ok(memUsage, 'couldn\'t collect mem usage');
          memStats.push(memUsage);
          memResults.push(runResults[lastEvent] - start);
        } else {
          app.close();
        }

        assert.ok(Object.keys(runResults).length, 'empty results');
        performanceHelper.reportRunDurations(runResults, null, delta);
      });
    });

    // results is an Array of values, one per run.
    assert.ok(memResults.length == config.runs, 'missing memory runs');

    PerformanceHelper.reportDuration(memResults);
    PerformanceHelper.reportMemory(memStats);

    performanceHelper.finish();

    PerformanceHelper.reportGoal(goals);
  });
});
