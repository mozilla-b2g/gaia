'use strict';

var StatusBar = require('./lib/statusbar');

marionette('Status Bar icons - Alarm', function() {

  var client = marionette.client({
    prefs: {
      'dom.w3c_touch_events.enabled': 1
    },
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false,
      'alarm.enabled': true
    }
  });

  var system;
  var statusBar;

  setup(function() {
    system = client.loader.getAppClass('system');
    statusBar = new StatusBar(client);
    system.waitForStartup();
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
