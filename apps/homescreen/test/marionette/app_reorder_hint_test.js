'use strict';
/* global __dirname */

marionette('Homescreen - App reordering', function() {
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

  test('App reordering has a visual hint', function() {
    client.waitFor(function() {});
    var icons = home.visibleIcons;
    var location1 = icons[0].location();
    var location3 = icons[2].location();

    // Drag second icon over third icon
    actions.wait(0.5).press(icons[1]).wait(0.5).
      move(icons[2]).perform();

    // Test that the third icon moves out of the way in the right direction
    client.waitFor(function() {
      return icons[2].location().x < location3.x;
    });

    // Drag second icon over first icon
    actions.move(icons[0]).perform();

    // Test that the third icon returns to its original position
    client.waitFor(function() {
      return icons[2].location().x === location3.x;
    });

    // Test that the first icon moves out of the way in the right direction
    client.waitFor(function() {
      return icons[0].location().x > location1.x;
    });
  });
});
