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
    }
  });
  var home, system;

  setup(function() {
    home = client.loader.getAppClass('verticalhome');
    system = client.loader.getAppClass('system');
    system.waitForStartup();
    home.waitForLaunch();
    client.switchToFrame();
  });

  test('Proper layout for alerts', function() {
    client.executeScript(function() {
      window.wrappedJSObject.KeyboardManager._showingInputGroup = 'text';

      window.dispatchEvent(new CustomEvent('mozChromeEvent', {
        detail: {
          type: 'inputmethod-showall'
        }
      }));
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
