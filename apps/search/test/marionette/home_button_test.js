'use strict';

var assert = require('assert');
var Rocketbar = require('../../../system/test/marionette/lib/rocketbar.js');

marionette('Search - Home Button Press', function() {
  var client = marionette.client({
    profile: require(__dirname + '/client_options.js'),
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

  test('Home button returns to home screen', function() {
    home.waitForLaunch();
    rocketbar.homescreenFocus();
    rocketbar.enterText('calendar');

    // Ensure search results are displayed.
    search.goToResults();
    var calendarIdentifier = 'app://calendar.gaiamobile.org/manifest.webapp';
    search.checkResult(calendarIdentifier, 'Calendar');

    // Emulate the home button and ensure the home screen is displayed.
    client.switchToFrame();
    assert.ok(client.findElement(search.Selectors.iframe).displayed());
    system.tapHome();
    client.waitFor(function(){
      return !client.findElement(search.Selectors.iframe).displayed();
    });
  });
});
