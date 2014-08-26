'use strict';

var PerformanceHelper =  requireGaia('/tests/performance/performance_helper.js');
var App = requireGaia('/tests/performance/app.js');
var execSync = require('./exec-sync')

// Grab uptime and realtime values to act as reference to judge the boot time
// This function returns a timestamp representing calculated time of boot
function getReferencePoint() {
  var uptime_idle = execSync('adb shell cat /proc/uptime', true);
  if (uptime_idle.stderr) {
    throw new Error(uptime_idle.stderr);
  }
  var utime = +(uptime_idle.stdout.split(" ")[0]);

  // Note that $EPOCHREALTIME is a mksh builtin
  var epochrtime = execSync("adb shell echo '$EPOCHREALTIME'", true);
  if (epochrtime.stderr) {
    throw new Error(epochrtime.stderr);
  }
  var rtime = +(epochrtime.stdout);
  return (rtime - utime) * 1000;
}

// Reboot the device, and wait for adb to become available
// blocking call until adb service started.
function reboot() {
  var ret = execSync('adb reboot',true);
  if (ret.stderr) {
    throw new Error(ret.stderr);
  }

  ret = execSync('adb wait-for-devices',true);
  if (ret.stderr) {
    throw new Error(ret.stderr);
  }
}

// Wait until device has finished starting up
function waitForLogoDone(clientn) {
  var client = clientn.scope({
    searchTimeout: 20000
  });

  var osLogo = client.findElement('#os-logo');
  client.waitFor(function() {
    return client.findElements('#os-logo').length == 0;
  });
}

// Reboot the device before starting marionette collection
// Marionette b2g restart is disabled since this test manually
// controls the rebooting
reboot();

marionette(config.appPath + ' >', function() {
  var isHostRunner = (config.runnerHost === 'marionette-device-host');

  if(!isHostRunner) {
    // Abort ship, test only applicable to devices
    return;
  }

  var client = marionette.client({
    settings: {
      'ftu.manifestURL': null
    }
  });

  // Do nothing on script timeout. Bug 987383
  client.onScriptTimeout = null;

  var app = new App(client, config.appPath);

  setup(function() {
    this.timeout(config.timeout);
    client.setScriptTimeout(config.scriptTimeout);

    waitForLogoDone(client);
  });

  test('Boot Stats >', function () {
    var results = {};
    var normalised = getReferencePoint();

    var performanceHelper = new PerformanceHelper({
      app: app
    });

    // Function to get the boottimes object, that will be used for next few scripts
    // since in each app we store the times in the same object
    function grabBoottimes() {
      return window.wrappedJSObject.boottimes;
    }

    // Handler function as we wish to deal with the data in the same way
    function addResult(err, value) {
      for (var prop in value) {
        var val_s = value[prop];
        results[prop] = val_s - normalised;
      }
    }

    // System app's context
    client.executeScript(grabBoottimes, addResult);

    // homescreen context
    var homescreen = client.findElement("#homescreen iframe");
    client.switchToFrame(homescreen);
    client.executeScript(grabBoottimes, addResult);

    performanceHelper.reportRunDurations(results);
    performanceHelper.finish();
  });
});
