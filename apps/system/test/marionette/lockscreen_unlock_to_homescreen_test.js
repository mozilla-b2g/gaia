'use strict';

var dirapps = require('path').resolve(__dirname + '/../../../');
var Settings = require(dirapps + '/settings/test/marionette/app/app'),
    LockScreen = require('./lib/lockscreen'),
    LockScreenPasscodeUnlockActions = require(
      './lib/lockscreen_passcode_unlock_actions'),
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
  var actions;

  setup(function() {
    system = client.loader.getAppClass('system');
    lockScreen = (new LockScreen()).start(client);
    settingsApp = new Settings(client);
    settingsApp.launch();
    // Navigate to the ScreenLock menu
    screenLockPanel = settingsApp.screenLockPanel;
    screenLockPanel.setupScreenLock();
  });

  test('passcode is disabled so it will slide to unlock to homescreen',
  function(done) {
    screenLockPanel.toggleScreenLock();
    settingsApp.close();
    lockScreen.lock();

    new Promise(function(resolve) {
      actions = (new LockScreenPasscodeUnlockActions()).start(client);
      return lockScreen.slideToUnlock(resolve);
    })
    .then(function() {
      return actions.waitForUnlock();
    })
    .then(function() {
      client.switchToFrame(system.getHomescreenIframe());
      var homescreenShown = client.executeScript(function() {
        return !window.wrappedJSObject.document.hidden;
      });
      assert.ok(homescreenShown,
        'has not returned to homescreen');
    })
    .then(done)
    .catch(done);
  });
});
