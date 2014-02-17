'use strict';

var assert = require('assert');

var App = require('./app');
var PerformanceHelper = requireGaia('/tests/performance/performance_helper.js');
var MarionetteHelper = requireGaia('/tests/js-marionette/helper.js');

var manifestPath, entryPoint;

var arr = mozTestInfo.appPath.split('/');
manifestPath = arr[0];
entryPoint = arr[1];

marionette('startup test > ' + mozTestInfo.appPath + ' >', function() {

  var app;
  var client = marionette.client({
    settings: {
      'ftu.manifestURL': null
    }
  });

  var performanceHelper;
  var isHostRunner = (process.env.MARIONETTE_RUNNER_HOST == 'marionette-device-host');

  app = new App(client, mozTestInfo.appPath);
  if (app.skip) {
    return;
  }

  setup(function() {
    // Mocha timeout for this test
    this.timeout(100000);
    // Marionnette timeout for each command sent to the device
    client.setScriptTimeout(10000);

    MarionetteHelper.unlockScreen(client);
  });

  test('startup time', function() {

    performanceHelper = new PerformanceHelper({ app: app });

    PerformanceHelper.registerLoadTimeListener(client);

    var memStats = [];
    performanceHelper.repeatWithDelay(function(app, next) {
      app.launch();
      if (isHostRunner) {
        // we can only collect memory if we have a host device (adb)
        var memUsage = performanceHelper.getMemoryUsage(app);
        assert.ok(memUsage, 'couldn\'t collect mem usage');
        memStats.push(memUsage);
      }
      app.close();
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

    PerformanceHelper.reportDuration(results);
    PerformanceHelper.reportMemory(memStats);

    PerformanceHelper.unregisterLoadTimeListener(client);
  });
});
