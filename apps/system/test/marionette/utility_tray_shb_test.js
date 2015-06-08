'use strict';

var UtilityTray = require('./lib/utility_tray');

marionette('Utility Tray with SHB', function() {
  var system, actions, utilityTray, client;

  client = marionette.client({
     profile: {
      settings: {
        'software-button.enabled': true
      }
    }
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
    var element = utilityTray.visible;
    var screenHeight = element.size().height;

    actions.flick(element, 50, screenHeight, 50, -(screenHeight / 2), 100)
      .perform();

    utilityTray.waitForClosed();
  });
});
