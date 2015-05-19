'use strict';

var Rocketbar = require('../../../system/test/marionette/lib/rocketbar.js');

marionette('Search - App search', function() {
  var client = marionette.client({
    profile: require(__dirname + '/client_options.js')
  });
  var home, search, rocketbar, system;

  setup(function() {
    home = client.loader.getAppClass('verticalhome');
    system = client.loader.getAppClass('system');
    search = client.loader.getAppClass('search');
    rocketbar = new Rocketbar(client);
    system.waitForStartup();
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
