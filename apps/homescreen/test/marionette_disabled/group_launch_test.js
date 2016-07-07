'use strict';
/* global __dirname */

marionette('Homescreen - Group launching', function() {
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

  test('Launching an icon in a group', function() {
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

    // Open group and launch first icon
    var group = home.groups[0];
    home.openGroup(group);
    home.waitForVisibleIcons(2);
    home.launchIcon(home.visibleIcons[0]);
  });
});
