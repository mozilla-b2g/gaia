'use strict';

var assert = require('assert');
var App = require('./app');
var PerformanceHelper = requireGaia('/tests/performance/performance_helper.js');
var MarionetteHelper = requireGaia('/tests/js-marionette/helper.js');
var appPath = config.appPath;

var arr = appPath.split('/');
var manifestPath = arr[0];
var entryPoint = arr[1];

marionette('startup test > ' + appPath + ' >', function() {

  var app;
  var client = marionette.client({
    settings: {
      'ftu.manifestURL': null
    }
  });
  // Do nothing on script timeout. Bug 987383
  client.onScriptTimeout = null;

  var performanceHelper;
  var isHostRunner = (config.runnerHost === 'marionette-device-host');

  app = new App(client, appPath);
  if (app.skip) {
    return;
  }

  setup(function() {
    // Mocha timeout for this test
    this.timeout(config.timeout);
    // Marionnette timeout for each command sent to the device
    client.setScriptTimeout(config.scriptTimeout);

    MarionetteHelper.unlockScreen(client);
  });

  test('startup time', function() {

    performanceHelper = new PerformanceHelper({ app: app });

    PerformanceHelper.registerLoadTimeListener(client);

    var goals = PerformanceHelper.getGoalData(client);

    var memStats = [];
    performanceHelper.repeatWithDelay(function(app, next) {
      app.launch();

      if (!isHostRunner) {
        return app.close();
      }

      // we can only collect memory if we have a host device (adb)
      var memUsage = performanceHelper.getMemoryUsage(app);

      // Bug 1045717: be sure to close app before we assert the value of
      // memStats so we avoid leaking problems into other tests
      app.close();

      assert.ok(memUsage, 'couldn\'t collect mem usage');
      memStats.push(memUsage);
    });

    var results = PerformanceHelper.getLoadTimes(client);
    assert.ok(results, 'empty results');

    results = results.filter(function(element) {
      if (element.src.indexOf('app://' + manifestPath) !== 0) {
        return false;
      }
      if (entryPoint && element.src.indexOf(entryPoint) === -1) {
        return false;
      }
      return true;
    }).map(function(element) {
      return element.time;
    });

    // results is an Array of values, one per run.
    assert.ok(results.length == config.runs, 'missing runs');

    PerformanceHelper.reportDuration(results);
    PerformanceHelper.reportMemory(memStats);
    PerformanceHelper.reportGoal(goals);

    PerformanceHelper.unregisterLoadTimeListener(client);
  });
});
