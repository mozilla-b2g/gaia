'use strict';
/* global __dirname */

var assert = require('assert');

marionette('Homescreen - Group creation', function() {
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

  test('Creating a group', function() {
    var icons = home.visibleIcons;
    var iconId1 = home.getIconId(icons[0]);
    var iconId2 = home.getIconId(icons[1]);
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

    // Confirm that the group contains the two icons, in the correct order
    var group = home.groups[0];
    client.switchToShadowRoot(group);
    home.waitForVisibleIcons(2);
    icons = home.visibleIcons;
    assert.equal(home.getIconId(icons[0]), iconId2);
    assert.equal(home.getIconId(icons[1]), iconId1);
  });
});
