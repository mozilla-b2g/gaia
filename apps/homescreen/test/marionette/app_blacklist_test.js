'use strict';
var assert = require('assert');

marionette('Homescreen - App Blacklist', function() {

  var client = marionette.client({
    profile: require(__dirname + '/client_options.js')
  });
  var home, system;

  setup(function() {
    home = client.loader.getAppClass('homescreen');
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();

    client.apps.launch(home.URL);
    home.waitForLaunch();

    // Fail finding elements quickly.
    client.setSearchTimeout(20);
  });

  function lookForIcon(manifestURL) {
    try {
      home.getIcon(manifestURL);
    } catch(e) {
      return false;
    }
    return true;
  }

  test('app does not appear on home screen if in blacklist', function() {
    // Ensure that a normal icon is there.
    var calendarApp = lookForIcon('app://calendar.gaiamobile.org');
    assert.ok(calendarApp);
  });

});
