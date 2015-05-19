'use strict';

marionette('Software Home Button - Power Menu', function() {

  var client = marionette.client({
    profile: {
      prefs: {
        'focusmanager.testmode': true
      },
      settings: {
        'software-button.enabled': true
      }
    },
    desiredCapabilities: { raisesAccessibilityExceptions: true }
  });
  var system;

  setup(function() {
    system = client.loader.getAppClass('system');
    system.waitForStartup();
  });

  test('has proper layout', function() {
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
      var shbRect = system.softwareButtons.scriptWith(rect);

      return menuRect.bottom === shbRect.top &&
        winHeight === menuRect.height + shbRect.height;
    });
  });
});
