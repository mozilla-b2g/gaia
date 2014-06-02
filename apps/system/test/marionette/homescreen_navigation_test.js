'use strict';

marionette('Homescreen navigation >', function() {
  var ReflowHelper =
      require('../../../../tests/js-marionette/reflow_helper.js');

  var assert = require('assert');
  var System = require('./lib/system.js');

  var SETTINGS_APP = 'app://settings.gaiamobile.org';

  var client = marionette.client({
    prefs: {
      'dom.w3c_touch_events.enabled': 1,
      'devtools.debugger.forbid-certified-apps': false
    },
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false,
      'edgesgesture.enabled': true,
      'devtools.overlay': true,
      'hud.reflows': true
    }
  });


  var sys, settings, homescreen;
  var reflowHelper;

  function launchSettings() {
    var settings = sys.waitForLaunch(SETTINGS_APP);
    client.waitFor(function() {
      return settings.displayed() && !homescreen.displayed();
    });
    return settings;
  }

  function goHome() {
    sys.goHome();
    client.waitFor(function() {
      return !settings.displayed() && homescreen.displayed();
    });
  }

  suiteSetup(function() {
    sys = new System(client);
  });

  setup(function() {
    reflowHelper = new ReflowHelper(client);
    client.switchToFrame();
    sys.waitForStartup();

    homescreen = sys.getAppIframe('homescreen.gaiamobile.org');
    settings = launchSettings();
  });

  test('Going to the homescreen and back to a warm app', function() {
    // Since the clock will cause reflows we're disabling it
    // Also disabling the developer hud because of
    // https://bugzilla.mozilla.org/show_bug.cgi?id=971008
    sys.stopDevtools();
    sys.stopClock();

    goHome();
    launchSettings();

    reflowHelper.startTracking(System.URL);
    client.switchToFrame();

    goHome();
    launchSettings();

    var count = reflowHelper.getCount();
    assert.equal(count, 0, 'we got ' + count + ' reflows instead of 0');
    reflowHelper.stopTracking();
  });
});
