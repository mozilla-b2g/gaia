'use strict';

var assert = require('assert');

var App = require('./app');
var PerformanceHelper = requireGaia('/tests/performance/performance_helper.js');
var MarionetteHelper = requireGaia('/tests/js-marionette/helper.js');

var appPath = mozTestInfo.appPath;

var whitelistedApps = [
  'communications/contacts',
  'camera',
  'clock',
  'fm',
  'gallery',
  'settings',
  'sms',
  'communications/dialer'
];

var whitelistedUnifiedApps = [
  'camera',
  'communications/dialer',
  'fm',
  'gallery',
  'settings'
];

function contains(haystack, needle) {
  return haystack.indexOf(needle) !== -1;
}

if (!contains(whitelistedApps, appPath)) {
  return;
}

var arr = appPath.split('/');
var manifestPath = arr[0];
var entryPoint = arr[1];


marionette('startup event test > ' + appPath + ' >', function() {

  var client = marionette.client({
    settings: {
      'ftu.manifestURL': null
    }
  });
  // Do nothing on script timeout. Bug 987383
  client.onScriptTimeout = null;

  var lastEvent = contains(whitelistedUnifiedApps, appPath) ?
    'moz-app-loaded' :
    'startup-path-done';

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
    this.timeout(500000);
    client.setScriptTimeout(50000);

    // inject perf event listener
    PerformanceHelper.injectHelperAtom(client);

    MarionetteHelper.unlockScreen(client);
  });

  test('startup >', function() {

    performanceHelper.repeatWithDelay(function(app, next) {

      var waitForBody = false;
      app.launch(waitForBody);

      performanceHelper.waitForPerfEvent(function(runResults, error) {
        if (error) {
          app.close();
          throw error;
        } else {
          performanceHelper.reportRunDurations(runResults);
          assert.ok(Object.keys(runResults).length, 'empty results');
          app.close();
        }
      });
    });

    performanceHelper.finish();

  });

});
