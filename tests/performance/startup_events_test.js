'use strict';

var assert = require('assert');

var App = require('./app');
var PerformanceHelper = requireGaia('/tests/performance/performance_helper.js');

var appPath = mozTestInfo.appPath;

var whitelistedApps = [
  'camera',
  'calendar',
  'clock',
  'communications/contacts',
  'communications/dialer',
  'costcontrol',
  'email',
  'fm',
  'gallery',
  'settings',
  'sms',
  'video'
];

var whitelistedUnifiedApps = [
  'calendar',
  'camera',
  'clock',
  'communications/dialer',
  'communications/contacts',
  'costcontrol',
  'email',
  'fm',
  'gallery',
  'settings',
  'sms',
  'video'
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
      'ftu.manifestURL': null,
      'lockscreen.enabled': false
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
    this.timeout(500000);
    client.setScriptTimeout(50000);
    PerformanceHelper.injectHelperAtom(client);
    performanceHelper.unlockScreen();
  });

  test('startup >', function() {

    PerformanceHelper.registerTimestamp(client);

    performanceHelper.repeatWithDelay(function(app, next) {
      var waitForBody = false;
      PerformanceHelper.registerTimestamp(client);
      app.launch(waitForBody);

      performanceHelper.waitForPerfEvent(function(runResults, error) {
        if (error) {
          app.close();
          throw error;
        }

        runResults.start = PerformanceHelper.getEpochStart(client);

        assert.ok(runResults.start > 0, 'problem capturing start epoch');
        performanceHelper.reportRunDurations(runResults);
        app.close();
        assert.ok(Object.keys(runResults).length, 'empty results');
      });
    });

    performanceHelper.finish();

  });

});
