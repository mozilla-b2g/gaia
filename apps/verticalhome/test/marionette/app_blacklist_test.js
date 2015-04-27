'use strict';
var assert = require('assert');

marionette('Vertical - App Blacklist', function() {

  var client = marionette.client(require(__dirname + '/client_options.js'));
  var home, system;

  setup(function() {
    home = client.loader.getAppClass('verticalhome');
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();

    client.apps.launch(home.URL);
    home.waitForLaunch();
  });

  function lookForIcon(manifestURL) {
    // Fail finding elements quickly.
    var quickly = client.scope({
      searchTimeout: 20
    });

    try {
      quickly.findElement('[data-identifier*="' + manifestURL + '"]');
    } catch(e) {
      return false;
    }
    return true;
  }

  test('app does not appear on home screen if in blacklist', function() {
    // Bug 1106411 - Currently the privacy panel is blacklisted by default.
    var blacklistedUrl = 'app://privacy-panel.gaiamobile.org/manifest.webapp';
    var blacklistedIconFound = lookForIcon(blacklistedUrl);
    assert.equal(blacklistedIconFound, false);

    // Ensure the icon is not there after a restart.
    home.restart();
    blacklistedIconFound = lookForIcon(blacklistedUrl);
    assert.equal(blacklistedIconFound, false);

    // Ensure that a normal icon is there.
    var calendarApp = lookForIcon('app://calendar.gaiamobile.org');
    assert.ok(calendarApp);
  });

});
