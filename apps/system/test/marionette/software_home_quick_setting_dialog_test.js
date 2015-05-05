'use strict';

marionette('Software Home Button - Quick Settings Dialog', function() {

  var client = marionette.client({
    prefs: {
      'focusmanager.testmode': true,
      'dom.w3c_touch_events.enabled': 1
    },
    settings: {
      'software-button.enabled': true
    }
  }, undefined, { 'raisesAccessibilityExceptions': true });
  var home, system;

  setup(function() {
    home = client.loader.getAppClass('verticalhome');
    system = client.loader.getAppClass('system');
    system.waitForStartup();
    home.waitForLaunch();
    client.switchToFrame();
  });

  test('Proper layout for quick settings data dialog', function() {
    client.executeScript(function() {
      var dialog = document.querySelector('#quick-setting-data-enabled-dialog');
      dialog.classList.add('visible');
    });

    function rect(el) {
      return el.getBoundingClientRect();
    }

    var winHeight = client.findElement('body').size().height;
    client.waitFor(function() {
      var dialog = client.findElement('#quick-setting-data-enabled-dialog');
      var dialogRect = dialog.scriptWith(rect);
      var shbRect = system.softwareButtons.scriptWith(rect);

      return dialogRect.bottom === shbRect.top &&
        winHeight === (dialogRect.height + shbRect.height);
    });
  });
});
