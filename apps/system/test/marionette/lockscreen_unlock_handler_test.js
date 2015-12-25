
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
    screenLockPanel.toggleScreenLock();
  });

  var setupPasscode = function() {
    screenLockPanel.togglePasscodeLock();
    screenLockPanel.typePasscode('1234', '1234');
    screenLockPanel.tapCreatePasscode();
    settingsApp.close();
    lockScreen.lock();
  };

  var setupWithoutPasscode = function() {
    settingsApp.close();
    lockScreen.lock();
  };

  test('slide to the unlock handler without the passcode, and then check ' +
       'if the slider will reset after lock it again', 
  function(done) {
    setupWithoutPasscode();
    client.switchToFrame();
    new Promise(function(resolve) {
      lockScreen.slideToUnlock(resolve);
    })
    .then(function() {
      client.executeScript(function() {
        window.wrappedJSObject.Service.request('turnScreenOff', true);
        window.wrappedJSObject.Service.request('turnScreenOn', true);
      });

      client.waitFor(function() {
        return client.findElement('#lockscreen').displayed();
      });

      // From UI to check if it's back to the original style.
      // We cannot check if the canvas 'element' is streched or not.
      // If it's not reset the class `dark` will not attach on it.
      assert.ok(client.executeScript(function() {
        return document.querySelector('#lockscreen-area-unlock')
          .classList.contains('dark');
      }));
    })
    .then(done)
    .catch(done);
  });

  test('slide to the unlock handler with the passcode, and then check ' +
       'if the slider will reset after lock it again', 
  function(done) {
    setupPasscode();
    client.switchToFrame();
    new Promise(function(resolve) {
      lockScreen.slideToUnlock(resolve);
    })
    .then(function() {
      // Wait for the panel rising.
      client.waitFor(function() {
        return client.findElement('#lockscreen-passcode-code').displayed();
      });

      client.executeScript(function() {
        window.wrappedJSObject.Service.request('turnScreenOff', true);
        window.wrappedJSObject.Service.request('turnScreenOn', true);
      });

      client.waitFor(function() {
        return client.findElement('#lockscreen').displayed();
      });

      assert.ok(!client.findElement('#lockscreen-passcode-pad').displayed());

      // From UI to check if it's back to the original style.
      // We cannot check if the canvas 'element' is streched or not.
      // If it's not reset the class `dark` will not attach on it.
      assert.ok(client.executeScript(function() {
        return document.querySelector('#lockscreen-area-unlock')
          .classList.contains('dark');
      }));
    })
    .then(done)
    .catch(done);
  });

});
