'use strict';

marionette('Software Home Button - IME Menu', function() {

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
  var home, system;

  setup(function() {
    home = client.loader.getAppClass('homescreen');
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
    home.waitForLaunch();
    client.switchToFrame();
  });

  test('Proper layout for alerts', function() {
    client.executeScript(function() {
      // XXX: This is a dirty trick to ask KeyboardManager to show the menu
      // without an active keyboard present. Why are we doing this?

      window.wrappedJSObject.KeyboardManager._showingInputGroup = 'text';
      window.wrappedJSObject.KeyboardManager._showImeMenu();
    });

    function rect(el) {
      return el.getBoundingClientRect();
    }

    var winHeight = client.findElement('body').size().height;
    client.waitFor(function() {
      var menuRect = system.imeMenu.scriptWith(rect);
      var shbRect = system.softwareButtons.scriptWith(rect);

      return winHeight === (menuRect.height + shbRect.height);
    });
  });
});
