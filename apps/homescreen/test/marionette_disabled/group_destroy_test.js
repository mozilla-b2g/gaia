'use strict';
/* global __dirname */

marionette('Homescreen - Group destruction', function() {
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

  test('Removing the penultimate icon in a group', function() {
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

    // Open the group and wait for it to populate
    var group = home.groups[0];
    home.openGroup(group);
    home.waitForVisibleIcons(2);

    // Drag the first icon out of the group
    icons = home.visibleIcons;
    actions.press(icons[0]).wait(0.5).
      moveByOffset(0, -iconSize.height).release().perform();

    // Wait for the group to disappear
    client.switchToShadowRoot();
    home.waitForGroups(nGroups);
  });
});
