'use strict';
/* global __dirname */

var assert = require('assert');

marionette('Homescreen - App order', function() {
  var client = marionette.client({
    profile: require(__dirname + '/client_options_bookmarks.js')
  });
  var actions, home, system;

  setup(function() {
    actions = client.loader.getActions();
    home = client.loader.getAppClass('homescreen');
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
    home.waitForLaunch();
  });

  test('App order is retained after restart', function() {
    // Drag icon to a different place
    var icons = home.visibleIcons;
    var location1 = icons[0].location();
    var location2 = icons[1].location();
    actions.wait(0.5).press(icons[0]).wait(0.5).
      move(icons[1]).release().wait(0.5).perform();

    assert.equal(icons[0].location().x, location2.x);
    assert.equal(icons[1].location().x, location1.x);

    // Test that icon ordering is retained
    icons = home.visibleIcons.map(function(icon) {
      return home.getIconText(icon);
    });
    var numIcons = icons.length;

    home.restart();

    client.waitFor(function() {
      return home.visibleIcons.length === numIcons;
    });

    var newIcons = home.visibleIcons.map(function(icon) {
      return home.getIconText(icon);
    });
    for (var i = 0, iLen = icons.length; i < iLen; i++) {
      assert.equal(icons[i], newIcons[i]);
    }
  });

});
