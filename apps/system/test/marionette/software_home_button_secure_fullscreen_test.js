'use strict';

marionette('Software Home Button - Secure Fullscreen App', function() {

  var client = marionette.client({
    profile: {
      settings: {
        'lockscreen.enabled': true,
        'software-button.enabled': true
      }
    }
  });
  var system;

  setup(function() {
    system = client.loader.getAppClass('system');
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
