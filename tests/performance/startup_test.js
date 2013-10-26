'use strict';

var App = require('./app');
var PerformanceHelper = require(GAIA_DIR + '/tests/performance/performance_helper.js');

var manifestPath, entryPoint;

var arr = mozTestInfo.appPath.split('/');
manifestPath = arr[0];
entryPoint = arr[1];

marionette('startup test ' + mozTestInfo.appPath + ' >', function() {

  var app;
  var client = marionette.client({
    settings: {
      'ftu.manifestURL': null
    }
  });

  var performanceHelper;

  app = new App(client, mozTestInfo.appPath);
  if (app.skip) {
    return;
  }

  performanceHelper = new PerformanceHelper({ app: app });

  suite(mozTestInfo.appPath + ' >', function() {

    test('startup time', function() {

      // Mocha timeout for this test
      this.timeout(100000);
      // Marionnette timeout for each command sent to the device
      client.setScriptTimeout(10000);

      app.unlock(); // it affects the first run otherwise
      PerformanceHelper.registerLoadTimeListener(client);

      app.launch();
      app.close();

      var results = PerformanceHelper.getLoadTimes(client);
      PerformanceHelper.reportDuration(results.time);
      PerformanceHelper.unregisterLoadTimeListener(client);
    });
  });

});

