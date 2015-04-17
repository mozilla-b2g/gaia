'use strict';

marionette('Software Home Button - Secure Fullscreen App', function() {

  var client = marionette.client({
    prefs: {
      'dom.w3c_touch_events.enabled': 1
    },
    settings: {
      'lockscreen.enabled': true,
      'software-button.enabled': true
    }
  });
  var system;

  setup(function() {
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
  });

  test('ensures button is visible', function() {
    client.executeScript(function() {
      window.wrappedJSObject.Service.request('unlock');
    });
    client.waitFor(function() {
      return system.softwareHome.displayed();
    });
  });
});
