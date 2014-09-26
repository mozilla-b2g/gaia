'use strict';

var System = require('../../../system/test/marionette/lib/system');
var Search = require('./lib/search');
var Rocketbar = require('../../../system/test/marionette/lib/rocketbar.js');
var Home2 = require('../../../verticalhome/test/marionette/lib/home2.js');

marionette('Search - App search', function() {
  var client = marionette.client(Home2.clientOptions);
  var home, search, rocketbar, system;

  setup(function() {
    home = new Home2(client);
    system = new System(client);
    search = new Search(client);
    rocketbar = new Rocketbar(client);
    system.waitForStartup();
    search.removeGeolocationPermission();
  });

  test('Search apps from Rocketbar', function() {
    home.waitForLaunch();
    home.focusRocketBar();
    search.triggerFirstRun(rocketbar);
    rocketbar.enterText('calendar');
    search.goToResults();
    var calendarIdentifier = 'app://calendar.gaiamobile.org/manifest.webapp';
    var result = search.checkResult(calendarIdentifier, 'Calendar');
    result.tap();
    search.goToApp('app://calendar.gaiamobile.org');
  });

  test('Search for app with entry point', function() {
    home.waitForLaunch();
    home.focusRocketBar();
    search.triggerFirstRun(rocketbar);
    rocketbar.enterText('Phone');
    search.goToResults();
    var phoneIdentifier =
      'app://communications.gaiamobile.org/manifest.webapp-dialer';
    var result = search.checkResult(phoneIdentifier, 'Phone');
    result.tap();
    search.goToApp('app://communications.gaiamobile.org', 'dialer');
  });

});
