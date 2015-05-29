'use strict';

var StatusBar = require('./lib/statusbar');

marionette('Status Bar icons - Alarm', function() {

  var client = marionette.client({
    profile: {
      settings: {
        'alarm.enabled': true
      }
    }
  });

  var system;
  var statusBar;

  setup(function() {
    system = client.loader.getAppClass('system');
    statusBar = new StatusBar(client);
    system.waitForStartup();
    statusBar.init();
  });

  test('should disappear when the alarm.enabled setting changes', function() {
    statusBar.alarm.waitForIconToAppear();

    client.executeScript(function() {
      window.wrappedJSObject.navigator.mozSettings.createLock().set({
        'alarm.enabled': false
      });
    });

    statusBar.alarm.waitForIconToDisappear();
  });
});
