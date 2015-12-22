'use strict';

var dirapps = require('path').resolve(__dirname + '/../../../');
var Settings = require(dirapps + '/settings/test/marionette/app/app'),
    LockScreen = require('./lib/lockscreen'),
    Promise = require('es6-promise').Promise, // jshint ignore:line
    assert = require('assert');

marionette('LockScreen > ', function() {
  var client = marionette.client({
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });
  var system;
  var settingsApp;
  var screenLockPanel;
  var lockScreen;

  setup(function() {
    system = client.loader.getAppClass('system');
    lockScreen = (new LockScreen()).start(client);
    settingsApp = new Settings(client);
    settingsApp.launch();
    // Navigate to the ScreenLock menu
    screenLockPanel = settingsApp.screenLockPanel;
    screenLockPanel.setupScreenLock();
  });

  test('pressing home button will do nothing effects LockScreen',
  function() {
    screenLockPanel.toggleScreenLock();
    settingsApp.close();
    lockScreen.lock();
    assert.ok(client.findElement('#lockscreen').displayed());
    // To "tap" on home button.
    client.executeScript(function() {
      window.wrappedJSObject.dispatchEvent(
        new window.wrappedJSObject.CustomEvent('home'));
    });
    assert.ok(client.findElement('#lockscreen').displayed());
  });
});
