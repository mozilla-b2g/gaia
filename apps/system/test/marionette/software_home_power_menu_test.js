'use strict';

marionette('Software Home Button - Power Menu', function() {

  var client = marionette.client({
    prefs: {
      'focusmanager.testmode': true,
      'dom.w3c_touch_events.enabled': 1
    },
    settings: {
      'software-button.enabled': true
    }
  });
  var system;

  setup(function() {
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
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
