'use strict';

var Rocketbar = require('../../../system/test/marionette/lib/rocketbar.js');

marionette('Search - App search', function() {
  var profile = require(__dirname + '/client_options.js');
  // Causing a crash in this test, so disable apz.
  profile.prefs = {
    'layers.async-pan-zoom.enabled': false
  };
  var client = marionette.client({
    profile: profile,
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });
  var home, search, rocketbar, system;

  setup(function() {
    home = client.loader.getAppClass('homescreen');
    system = client.loader.getAppClass('system');
    search = client.loader.getAppClass('search');
    rocketbar = new Rocketbar(client);
    system.waitForFullyLoaded();
  });

  test('Search apps from Rocketbar', function() {
    home.waitForLaunch();
    rocketbar.homescreenFocus();
    rocketbar.enterText('calendar');
    search.goToResults();
    var calendarIdentifier = 'app://calendar.gaiamobile.org/manifest.webapp';
    var result = search.checkResult(calendarIdentifier, 'Calendar');
    result.tap();
    search.goToApp('app://calendar.gaiamobile.org');
  });

  test('Search for app with entry point', function() {
    home.waitForLaunch();
    rocketbar.homescreenFocus();
    rocketbar.enterText('Phone');
    search.goToResults();
    var phoneIdentifier =
      'app://communications.gaiamobile.org/manifest.webapp-dialer';
    var result = search.checkResult(phoneIdentifier, 'Phone');
    result.tap();
    search.goToApp('app://communications.gaiamobile.org', 'dialer');
  });

});
