'use strict';

marionette('Homescreen navigation >', function() {
  var ReflowHelper =
      require('../../../../tests/jsmarionette/plugins/reflow_helper.js');

  var assert = require('assert');

  var SETTINGS_APP = 'app://settings.gaiamobile.org';

  var client = marionette.client({
    profile: {
      prefs: {
        'browser.safebrowsing.enabled': false,
        'browser.safebrowsing.malware.enabled': false,
        'devtools.debugger.forbid-certified-apps': false,
        'privacy.trackingprotection.enabled': false
      },
      settings: {
        'devtools.overlay': true,
        'hud.reflows': true,
        'notifications.resend': false
      }
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

  setup(function() {
    reflowHelper = new ReflowHelper(client);
    client.switchToFrame();
    sys = client.loader.getAppClass('system');
    sys.waitForStartup();

    homescreen = sys.getAppIframe('verticalhome.gaiamobile.org');
    settings = launchSettings();
  });

  test('Going to the homescreen and back to a warm app', function() {
    // Since the clock will cause reflows we're disabling it
    // Also disabling the developer hud because of
    // https://bugzilla.mozilla.org/show_bug.cgi?id=971008
    sys.stopStatusbar();
    sys.stopDevtools();
    sys.stopClock();

    goHome();
    launchSettings();

    reflowHelper.startTracking(sys.URL);
    client.switchToFrame();

    goHome();
    launchSettings();

    var count = reflowHelper.getCount();
    assert.equal(count, 2, 'we got ' + count + ' reflows instead of 2');
    reflowHelper.stopTracking();
  });
});
