'use strict';

var Actions = require('marionette-client').Actions;
var StatusBar = require('./lib/statusbar');

marionette('Statusbar Visibility', function() {
  var client = marionette.client({
    prefs: {
      'dom.w3c_touch_events.enabled': 1
    },
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false,
      'nfc.enabled': true
    }
  });

  var actions = new Actions(client);
  var statusBar = new StatusBar(client);
  var halfScreenHeight, system;

  setup(function() {
    system = client.loader.getAppClass('system');
    system.waitForStartup();
    halfScreenHeight = client.executeScript(function() {
      return window.innerHeight;
    }) / 2;
  });

  test('Visibility of date in utility tray', function() {
    actions
      .press(system.topPanel)
      .moveByOffset(0, halfScreenHeight)
      .release()
      .perform();
    client.waitFor(function() {
      // The element is rendered with moz-element so we can't use
      // marionette's .displayed()
      var visibility = system.statusbarLabel.scriptWith(function(element) {
        return window.getComputedStyle(element).visibility;
      });
      return (visibility == 'visible');
    });
  });

  test('NFC icon is visible', function() {
    statusBar.nfc.waitForIconToAppear();
  });
});
