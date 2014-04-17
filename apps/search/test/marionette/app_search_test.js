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
  });

  test('Search apps from Rocketbar', function() {
    rocketbar.focus();
    rocketbar.enterText('calendar');
    search.goToResults();
    search.checkResult('firstApp', 'Calendar');
    search.goToApp('app://calendar.gaiamobile.org');
  });

  test('Search for app with entry point', function() {
    rocketbar.focus();
    rocketbar.enterText('Phone');
    search.goToResults();
    search.checkResult('firstApp', 'Phone');
    search.goToApp('app://communications.gaiamobile.org', 'dialer');
  });

});
