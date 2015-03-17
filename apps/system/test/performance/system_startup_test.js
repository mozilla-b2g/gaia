'use strict';

var App = requireGaia('/tests/performance/app');
var PerformanceHelper = requireGaia('/tests/performance/performance_helper');
var exec = requireGaia('/tests/performance/exec-sync');
var perfUtils = requireGaia('/tests/performance/perf-utils');
var appPath = config.appPath;

if (!perfUtils.isDeviceHost()) {
  return;
}

var reboot = function() {
  exec('adb reboot');
  exec('adb wait-for-device');
};

reboot();

marionette('startup event test > ' + appPath + ' >', function() {

  var client = marionette.client();
  var app = new App(client, appPath);

  // Do nothing on script timeout. Bug 987383
  client.onScriptTimeout = null;

  if (app.skip) {
    return;
  }

  var helper = new PerformanceHelper({
    app: app
  });

  setup(function () {
    this.timeout(config.timeout);
    client.setScriptTimeout(config.scriptTimeout);
  });

  test('startup >', function () {
    client.switchToFrame();
    client.waitFor(function() {
      var mozOsLogoEnd = client.executeScript(function() {
        return window.wrappedJSObject.mozPerformance.timing.mozOsLogoEnd;
      });

      return !!mozOsLogoEnd;
    });

    // The Flame has a buggy boot timestamp implementation, so capturing the
    // time since requestStart
    var timing = client.executeScript(function() {
      var timing = window.wrappedJSObject.mozPerformance.timing;
      timing.start = window.wrappedJSObject.performance.timing.requestStart;
      return timing;
    });

    // Capture when the homescreen was started
    client.switchToFrame(client.findElement('#homescreen iframe'));
    client.waitFor(function() {
      var mozHomescreenStart = client.executeScript(function() {
        return window.wrappedJSObject.mozPerformance &&
          window.wrappedJSObject.mozPerformance.timing.mozHomescreenStart;
      });

      return !!mozHomescreenStart;
    });

    var homescreenTiming = client.executeScript(function() {
      return window.wrappedJSObject.mozPerformance.timing;
    });

    perfUtils.merge(timing, homescreenTiming);

    helper.reportRunDurations(timing);
    helper.finish();
  });
});
