'use strict';
/* global __dirname */

var assert = require('assert');

marionette('Homescreen - Group appending', function() {
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

  test('Appending to a group', function() {
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

    // Drag a third icon into the group
    var group = home.groups[0];
    icons = home.visibleIcons;
    var iconId = home.getIconId(icons[0]);
    actions.press(icons[0]).wait(0.5).move(group).
      moveByOffset(iconSize.width / 4, 0).perform();
    client.waitFor(function() {
      return icons[0].size().width < iconSize.width;
    });
    actions.release().perform();

    // Confirm that the group contains three icons and the third icon is the
    // expected icon.
    client.switchToShadowRoot(group);
    home.waitForVisibleIcons(3);
    icons = home.visibleIcons;
    assert.equal(home.getIconId(icons[2]), iconId);
  });
});
