'use strict';

var System = require('./lib/system');

marionette('Software Home Button - Lockscreen Power Menu', function() {

  var client = marionette.client({
    prefs: {
      'focusmanager.testmode': true,
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

  test('Covers entire screen', function() {
    // Emulate holding the sleep button to trigger the power menu.
    client.executeScript(function() {
      window.wrappedJSObject.dispatchEvent(new CustomEvent('holdsleep'));
    });

    function rect(el) {
      return el.getBoundingClientRect();
    }

    var winHeight = client.findElement('body').size().height;
    client.waitFor(function() {
      var menuRect = system.sleepMenuContainer.scriptWith(rect);
      return menuRect.height === winHeight;
    });
  });
});
