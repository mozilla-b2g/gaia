'use strict';
/* global __dirname */

var assert = require('assert');

marionette('Homescreen - App order', function() {
  var client = marionette.client({
    profile: require(__dirname + '/client_options.js')
  });
  var actions, home, system;

  setup(function() {
    actions = client.loader.getActions();
    home = client.loader.getAppClass('homescreen');
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
  });

  test('App order is retained after restart', function() {
    // Drag icon to a different place
    var icons = home.visibleIcons;
    var location1 = icons[0].location();
    var location2 = icons[1].location();
    actions.wait(0.5).press(icons[0]).wait(0.5).
      move(icons[1]).release().wait(0.5).perform();

    client.waitFor(function() {
      return icons[0].location().x === location2.x &&
             icons[1].location().x === location1.x;
    });

    // Wait for the icon order to be saved
    home.waitForSavedOrder();
    var ids = home.getIconIdentifiers();
    var numIcons = ids.length;

    // Test that icon ordering is retained after a restart
    home.restart();

    client.waitFor(function() {
      return home.getIconIdentifiers().length === numIcons;
    });

    var newIds = home.getIconIdentifiers();
    for (var i = 0, iLen = ids.length; i < iLen; i++) {
      assert.equal(ids[i], newIds[i]);
    }
  });

});
