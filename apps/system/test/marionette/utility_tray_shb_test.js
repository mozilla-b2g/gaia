'use strict';

var UtilityTray = require('./lib/utility_tray');

marionette('Utility Tray with SHB', function() {
  var system, actions, utilityTray, client;

  client = marionette.client({
     profile: {
      settings: {
        'software-button.enabled': true
      }
    },
    desiredCapabilities: { raisesAccessibilityExceptions: true }
  });

  setup(function() {
    system = client.loader.getAppClass('system');
    actions = client.loader.getActions();
    utilityTray = new UtilityTray(client);
    system.waitForFullyLoaded();
  });

  test('Swiping up', function() {
    utilityTray.open();
    utilityTray.waitForOpened();
    utilityTray.swipeUp();
    utilityTray.waitForClosed();
  });
});
