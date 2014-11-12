'use strict';

var assert = require('assert');
var System = require('../../../system/test/marionette/lib/system');
var Search = require('./lib/search');
var Rocketbar = require('../../../system/test/marionette/lib/rocketbar.js');
var Home2 = require('../../../verticalhome/test/marionette/lib/home2.js');

marionette('Search - Home Button Press', function() {
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

  test('Home button returns to home screen', function() {
    home.waitForLaunch();
    home.focusRocketBar();
    search.triggerFirstRun(rocketbar);
    rocketbar.enterText('calendar');

    // Ensure search results are displayed.
    search.goToResults();
    var calendarIdentifier = 'app://calendar.gaiamobile.org/manifest.webapp';
    search.checkResult(calendarIdentifier, 'Calendar');

    // Emulate the home button and ensure the home screen is displayed.
    client.switchToFrame();
    assert.ok(client.findElement(Search.Selectors.iframe).displayed());
    system.goHome();
    client.waitFor(function(){
      return !client.findElement(Search.Selectors.iframe).displayed();
    });
  });
});
