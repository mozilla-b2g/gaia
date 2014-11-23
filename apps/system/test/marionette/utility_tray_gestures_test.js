'use strict';

var Actions = require('marionette-client').Actions;
var UtilityTray = require('./lib/utility_tray');

marionette('Utility Tray - Gestures', function() {
  var client = marionette.client({
    prefs: {
      'dom.w3c_touch_events.enabled': 1
    },
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false
    }
  });

  var actions;
  var system;
  var utilityTray;
  var halfWidth;
  var halfHeight;

  setup(function() {
    actions = new Actions(client);
    system = client.loader.getAppClass('system');
    utilityTray = new UtilityTray(client);

    system.waitForStartup();

    var width = client.executeScript(function() {
      return window.innerWidth;
    });
    halfWidth = width / 2;

    var height = client.executeScript(function() {
      return window.innerHeight;
    });
    halfHeight = height / 2;
  });

  function swipeDown(element) {
    client.waitFor(function() {
      return element.displayed;
    });

    // Works better than actions.flick().
    actions
      .press(element)
      .moveByOffset(0, halfHeight)
      .release()
      .perform();
  }

  function swipeUp(element) {
    client.waitFor(function() {
      return element.displayed;
    });
    actions
      .flick(element, halfWidth, 10, halfWidth, -halfHeight, 100)
      .perform();
  }

  test('Swiping down', function() {
    var topPanel = system.topPanel;

    swipeDown(topPanel);
    utilityTray.waitForOpened();
  });

  test('Swiping down when already opened', function() {
    var topPanel = system.topPanel;

    swipeDown(topPanel);
    utilityTray.waitForOpened();

    swipeDown(topPanel);
    utilityTray.waitForOpened();
  });

  test('Swiping up', function() {
    var grippy = client.findElement(utilityTray.Selectors.grippy);

    utilityTray.open();

    swipeUp(grippy);
    utilityTray.waitForClosed();
  });
});
