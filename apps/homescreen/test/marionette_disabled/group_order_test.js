'use strict';
/* global __dirname */

var assert = require('assert');

marionette('Homescreen - Group ordering', function() {
  var client = marionette.client({
    profile: require(__dirname + '/client_options.js'),

    // XXX Tapping in shadow roots doesn't work with this enabled
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });
  var actions, home, system;

  setup(function() {
    actions = client.loader.getActions();
    home = client.loader.getAppClass('homescreen');
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
  });

  test('Reordering an icon in a group', function() {
    var icons = home.visibleIcons;
    var nGroups = home.groups.length;
    var iconSize = icons[1].size();

    // Drag icon over another icon away from the center to create a group
    actions.press(icons[0]).wait(0.5).
      move(icons[1]).moveByOffset(-iconSize.width / 4, 0).perform();

    // Wait for the icon to shrink to indicate grouping will happen
    client.waitFor(function() {
      return icons[1].size().width < iconSize.width;
    });

    // Release and wait for icons to be removed and group to be created
    actions.release().perform();
    home.waitForVisibleIcons(icons.length - 2);
    home.waitForGroups(nGroups + 1);

    // Open group and wait for it to be populated
    var group = home.groups[0];
    home.openGroup(group);
    home.waitForVisibleIcons(2);

    // Drag icon to a different place
    icons = home.visibleIcons;
    var iconId0 = home.getIconId(icons[0]);
    var iconId1 = home.getIconId(icons[1]);
    var location = icons[1].location();
    actions.press(icons[0]).wait(0.5).move(icons[1]).perform();
    client.waitFor(function() {
      return icons[1].location().x < location.x;
    });
    actions.release().perform();
    client.waitFor(function() {
      icons = home.visibleIcons;
      return (home.getIconId(icons[0]) === iconId1) &&
             (home.getIconId(icons[1]) === iconId0);
    });

    // Wait for the icon order to be saved
    client.switchToShadowRoot();
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
