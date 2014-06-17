'use strict';

var System = require('../../../system/test/marionette/lib/system');
var Search = require('./lib/search');
var Rocketbar = require('../../../system/test/marionette/lib/rocketbar.js');

marionette('Search - App search', function() {
  var client = marionette.client(Rocketbar.clientOptions);
  var search, rocketbar, system;

  setup(function() {
    system = new System(client);
    search = new Search(client);
    rocketbar = new Rocketbar(client);
    system.waitForStartup();
    search.removeGeolocationPermission();
  });

  test('Search apps from Rocketbar', function() {
    client.switchToFrame();
    rocketbar.focus();
    search.triggerFirstRun(rocketbar);
    rocketbar.focus();
    rocketbar.enterText('calendar');
    search.goToResults();
    var calendarIdentifier = 'app://calendar.gaiamobile.org/manifest.webapp';
    search.checkAppResult(calendarIdentifier, 'Calendar');
    search.goToApp('app://calendar.gaiamobile.org');
  });

  test('Search for app with entry point', function() {
    client.switchToFrame();
    rocketbar.focus();
    search.triggerFirstRun(rocketbar);
    rocketbar.focus();
    rocketbar.enterText('Phone');
    search.goToResults();
    var phoneIdentifier =
      'app://communications.gaiamobile.org/manifest.webapp-dialer';
    search.checkAppResult(phoneIdentifier, 'Phone');
    search.goToApp('app://communications.gaiamobile.org', 'dialer');
  });

});
