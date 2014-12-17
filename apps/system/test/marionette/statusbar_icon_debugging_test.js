'use strict';

var StatusBar = require('./lib/statusbar');

marionette('Status Bar icons - Debugging', function() {

  var client = marionette.client({
    prefs: {
      'dom.w3c_touch_events.enabled': 1
    },
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false,
      'debugger.remote-mode': 'disabled'
    }
  });

  var system;
  var statusBar;

  setup(function() {
    system = client.loader.getAppClass('system');
    statusBar = new StatusBar(client);
    system.waitForStartup();
  });

  test('should appear when debugging is enabled', function() {
    // Enable full debugging, icon should appear.
    client.executeScript(function() {
      window.wrappedJSObject.navigator.mozSettings.createLock().set({
        'debugger.remote-mode': 'adb-devtools'
      });
    });
    statusBar.debugging.waitForIconToAppear();

    // Disable debugging, icon should disappear.
    client.executeScript(function() {
      window.wrappedJSObject.navigator.mozSettings.createLock().set({
        'debugger.remote-mode': 'disabled'
      });
    });
    statusBar.debugging.waitForIconToDisappear();
  });

  test('should appear when only adb is enabled', function() {
    client.executeScript(function() {
      window.wrappedJSObject.navigator.mozSettings.createLock().set({
        'debugger.remote-mode': 'adb-only'
      });
    });
    statusBar.debugging.waitForIconToAppear();
  });
});
