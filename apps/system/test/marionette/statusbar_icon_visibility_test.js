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
  var halfScreenHeight, system, grippyHeight;

  setup(function() {
    system = client.loader.getAppClass('system');
    system.waitForStartup();
    halfScreenHeight = client.executeScript(function() {
      return window.innerHeight;
    }) / 2;
    var grippy = client.findElement('#utility-tray-grippy');
    grippyHeight = grippy.size().height;
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

  test('Shadow visibility is hidden when passing the grippyHeight', function() {
    actions
      .press(system.topPanel)
      .moveByOffset(0, grippyHeight + 1)
      .perform();
    client.waitFor(function() {
      // The element is rendered with moz-element so we can't use
      // marionette's .displayed()
      var visibility = system.statusbarShadow.scriptWith(function(element) {
        return window.getComputedStyle(element).visibility;
      });
      return (visibility == 'hidden');
    });
  });

  test('Shadow visibility is visible before the grippyHeight', function() {
    actions
      .press(system.topPanel)
      .moveByOffset(0, grippyHeight - 1)
      .perform();
    client.waitFor(function() {
      // The element is rendered with moz-element so we can't use
      // marionette's .displayed()
      var visibility = system.statusbarShadow.scriptWith(function(element) {
        return window.getComputedStyle(element).visibility;
      });
      return (visibility == 'visible');
    });
  });

  // skipping since nfc.enabled triggers HW change and icon is updated
  // on success. Status bar needs to observe nfc.status setting.
  // This will be fixed and reenabled in Bug 1103874
  test.skip('NFC icon is visible', function() {
    statusBar.nfc.waitForIconToAppear();
  });
});
