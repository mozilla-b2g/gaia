'use strict';

var assert = require('chai').assert;

marionette('Software Home Button - App Crash Report Layout', function() {

  var client = marionette.client({
    settings: {
      'software-button.enabled': true
    }
  });
  var home, system;

  setup(function() {
    home = client.loader.getAppClass('verticalhome');
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
    home.waitForLaunch();
  });

  test('Proper layout for crash report dialog', function() {
    client.switchToFrame();

    // Emulate an app crash.
    client.executeScript(function() {

      // Dispatch a mozbrowsererror event to the app element.
      // This is not needed to show the dialog, but is nice to have as it
      // sets the proper title in the dialog, and might be more future-proof.
      var win = window.wrappedJSObject;
      var app = win.Service.query('getTopMostWindow');
      app.element.dispatchEvent(new CustomEvent('mozbrowsererror', {
        detail: {
          type: 'fatal'
        }
      }));

      // This triggers the system crash report dialog.
      win.dispatchEvent(new CustomEvent('mozChromeEvent', {
        detail: {
          type: 'handle-crash',
          crashID: 1,
          isChrome: false
        }
      }));
    });
    var dialogHeight = system.dialogOverlay.size().height;
    assert.ok(dialogHeight === expectedHeight());
  });

  function expectedHeight() {
    var winHeight = client.findElement('body').size().height;
    var shbHeight = system.softwareButtons.size().height;
    var statusbarHeight = system.statusbar.size().height;
    return (winHeight - statusbarHeight - shbHeight);
  }
});
