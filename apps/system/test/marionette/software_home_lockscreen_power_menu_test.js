'use strict';

marionette('Software Home Button - Lockscreen Power Menu', function() {

  var lockScreenFrameId = '#lockscreen-frame';

  var client = marionette.client({
    profile: {
      prefs: {
        'focusmanager.testmode': true
      },
      settings: {
        'software-button.enabled': true,
        'lockscreen.enabled': true
      }
    },
    desiredCapabilities: { raisesAccessibilityExceptions: true }
  });
  var system;

  setup(function() {
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
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
    var lockscreen = client.findElement(lockScreenFrameId);
    client.executeScript(function() {
      window.wrappedJSObject.dispatchEvent(
        new CustomEvent('lockscreenslide-activate-left'));
    });
    // Make sure lockscreen is not in foreground before continuing.
    client.helper.waitForElementToDisappear(lockscreen);

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
