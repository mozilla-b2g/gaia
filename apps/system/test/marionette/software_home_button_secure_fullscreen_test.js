'use strict';

var System = require('./lib/system');

marionette('Software Home Button - Secure Fullscreen App', function() {

  var client = marionette.client({
    prefs: {
      'dom.w3c_touch_events.enabled': 1
    },
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': true,
      'software-button.enabled': true
    }
  });
  var system;

  setup(function() {
    system = new System(client);
    system.waitForStartup();
  });

  test('ensures button is visible', function() {
    client.executeScript(function() {
      window.wrappedJSObject.dispatchEvent(
        new CustomEvent('lockscreenslide-activate-left'));
    });
    client.waitFor(function() {
      return system.softwareHome.displayed();
    });
  });
});
