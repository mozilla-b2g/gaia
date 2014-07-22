'use strict';

var Actions = require('marionette-client').Actions;
var System = require('../../../system/test/marionette/lib/system');

marionette('Statusbar Visibility', function() {
  var client = marionette.client({
    prefs: {
      'dom.w3c_touch_events.enabled': 1
    },
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false
    }
  });

  var actions = new Actions(client);
  var system = new System(client);
  var halfScreenHeight;

  setup(function() {
    system.waitForStartup();
    halfScreenHeight = client.executeScript(function() {
      return window.innerHeight;
    }) / 2;
  });

  test('Visibility of date in utility tray', function() {
    actions
      .press(system.statusbar)
      .moveByOffset(0, halfScreenHeight)
      .release()
      .perform();
    client.waitFor(function() {
      return system.statusbarLabel.displayed();
    });
  });

});
