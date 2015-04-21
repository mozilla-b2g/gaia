'use strict';

marionette('Software Home Button - Lockscreen Power Menu', function() {

  var client = marionette.client({
    prefs: {
      'focusmanager.testmode': true,
      'dom.w3c_touch_events.enabled': 1
    },
    settings: {
      'software-button.enabled': true,
      'lockscreen.enabled': true
    }
  });
  var system;

  setup(function() {
    system = client.loader.getAppClass('system');
    system.waitForStartup();
  });

  function rect(el) {
    return el.getBoundingClientRect();
  }

  test('Covers entire screen', function() {
    // Emulate holding the sleep button to trigger the power menu.
    client.executeScript(function() {
      window.wrappedJSObject.dispatchEvent(new CustomEvent('holdsleep'));
    });

    var winHeight = client.findElement('body').size().height;
    client.waitFor(function() {
      var menuRect = system.sleepMenuContainer.scriptWith(rect);
      return menuRect.height === winHeight;
    });
  });

  test('Leaves room for the SHB in secure-app mode', function() {
    client.executeScript(function() {
      window.wrappedJSObject.dispatchEvent(
        new CustomEvent('lockscreenslide-activate-left'));
    });

    client.executeScript(function() {
      window.wrappedJSObject.dispatchEvent(new CustomEvent('holdsleep'));
    });

    var shbRect = system.softwareButtons.scriptWith(rect);
    var winHeight = client.findElement('body').size().height;
    client.waitFor(function() {
      var menuRect = system.sleepMenuContainer.scriptWith(rect);
      return menuRect.height === (winHeight - shbRect.height);
    });
  });
});
