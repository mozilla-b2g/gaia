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
  var search, rocketbar, system;

  setup(function() {
    system = client.loader.getAppClass('system');
    search = client.loader.getAppClass('search');
    rocketbar = new Rocketbar(client);
    system.waitForFullyLoaded();
  });

  test('Search apps from Rocketbar', function() {
    rocketbar.homescreenFocus();
    rocketbar.enterText('calendar');
    search.goToResults();
    var settingsIdentifier = 'chrome://gaia/content/settings/manifest.webapp';
    var result = search.checkResult(settingsIdentifier, 'Settings');
    result.tap();
    search.goToApp('chrome://gaia/content/settings');
  });

  /*
   * XXXAus: Enable this test when Dialer (or other app with entry point) is
   *         updated.
  test('Search for app with entry point', function() {
    rocketbar.homescreenFocus();
    rocketbar.enterText('Phone');
    search.goToResults();
    var phoneIdentifier =
      'app://communications.gaiamobile.org/manifest.webapp-dialer';
    var result = search.checkResult(phoneIdentifier, 'Phone');
    result.tap();
    search.goToApp('app://communications.gaiamobile.org', 'dialer');
  });
  */

});
