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
  'costcontrol',
  'communications/contacts',
  'communications/dialer',
  'email',
  'fm',
  'gallery',
  'marketplace.firefox.com',
  'settings',
  'sms',
  'video'
];

var whitelistedUnifiedApps = [
  'camera',
  'calendar',
  'clock',
  'costcontrol',
  'communications/dialer',
  'communications/contacts',
  'email',
  'fm',
  'gallery',
  'marketplace.firefox.com',
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

        performanceHelper.reportRunDurations(runResults, null, delta);
        assert.ok(Object.keys(runResults).length, 'empty results');
        app.close();
      });
    });

    performanceHelper.finish();

  });

});
