'use strict';

var assert = require('assert');
var Search = require('./lib/search');
var Rocketbar = require('../../../system/test/marionette/lib/rocketbar.js');

marionette('Search - Home Button Press', function() {
  var client = marionette.client(require(__dirname + '/client_options.js'));
  var home, search, rocketbar, system;

  setup(function() {
    home = client.loader.getAppClass('verticalhome');
    system = client.loader.getAppClass('system');
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
    system.tapHome();
    client.waitFor(function(){
      return !client.findElement(Search.Selectors.iframe).displayed();
    });
  });
});
