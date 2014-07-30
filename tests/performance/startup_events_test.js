'use strict';

var assert = require('assert');

var App = require('./app');
var PerformanceHelper = requireGaia('/tests/performance/performance_helper.js');
var MarionetteHelper = requireGaia('/tests/js-marionette/helper.js');

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

        var epochEnd = PerformanceHelper.getEpochEnd(client);
        var epochStart = PerformanceHelper.getEpochStart(client);
        var delta = epochEnd - epochStart;

        // Bug 1045076: Sanity check. If for some reason any handlers
        // didn't register or we didn't get valid timestamps back, do not
        // report the values for this run and continue on
        if (!epochEnd || !epochStart || delta < 1) {
          return app.close();
        }

        performanceHelper.reportRunDurations(runResults, null, delta);
        app.close();
        assert.ok(Object.keys(runResults).length, 'empty results');
      });
    });

    performanceHelper.finish();

  });

});
