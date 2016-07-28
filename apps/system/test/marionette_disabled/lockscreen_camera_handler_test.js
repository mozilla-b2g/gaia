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

  test('slide to the camera handler, it should invoke the secure camera ' + 
       'while it should be dismissed after pressing the home button' , 
  function(done) {
    setupPasscode();
    client.switchToFrame();
    new Promise(function(resolve) {
      var notShownYet = client.executeScript(function() {
        return null === window.wrappedJSObject.document
          .querySelector('.secureAppWindow.fullscreen-app.active.render');
      });
      assert.ok(notShownYet);
      lockScreen.slideToOpenCamera(resolve);
    })
    .then(function() {
      client.waitFor(function() {
        var theCameraApp = client.executeScript(function() {
          return window.wrappedJSObject.document
            .querySelector('.secureAppWindow.fullscreen-app.active.render');
        });
        if (theCameraApp) {
          return theCameraApp.displayed();
        } else {
          return false;
        }
      });
      
      client.executeScript(function() {
        window.wrappedJSObject.dispatchEvent(new CustomEvent('home'));
      });

      client.waitFor(function() {
        var dismissed = client.executeScript(function() {
          return null === window.wrappedJSObject.document
            .querySelector('.secureAppWindow.fullscreen-app.active.render');
        });
        return dismissed;
      });
      assert.ok(!client.findElement('#lockscreen-passcode-code').displayed());
    })
    .then(done)
    .catch(done);
  });

  test('slide to the camera handler, it should invoke the secure camera, ' +
       'while it should be dismissed after pressing the power button', 
  function(done) {
    setupPasscode();
    client.switchToFrame();
    new Promise(function(resolve) {
      var notShownYet = client.executeScript(function() {
        return null === window.wrappedJSObject.document
          .querySelector('.secureAppWindow.fullscreen-app.active.render');
      });
      assert.ok(notShownYet);
      lockScreen.slideToOpenCamera(resolve);
    })
    .then(function() {
      client.waitFor(function() {
        var theCameraApp = client.executeScript(function() {
          return window.wrappedJSObject.document
            .querySelector('.secureAppWindow.fullscreen-app.active.render');
        });
        if (theCameraApp) {
          return theCameraApp.displayed();
        } else {
          return false;
        }
      });
      
      client.executeScript(function() {
        window.wrappedJSObject.Service.request('turnScreenOff', true);
        window.wrappedJSObject.Service.request('turnScreenOn', true);
      });

      client.waitFor(function() {
        var dismissed = client.executeScript(function() {
          return null === window.wrappedJSObject.document
            .querySelector('.secureAppWindow.fullscreen-app.active.render');
        });
        return dismissed;
      });
      assert.ok(!client.findElement('#lockscreen-passcode-code').displayed());
    })
    .then(done)
    .catch(done);
  });

  test('slide to the camera handler without passcode, ' +
       'it should invoke the camera app',
  function(done) {
    setupWithoutPasscode();
    client.switchToFrame();
    new Promise(function(resolve) {
      var notShownYet = client.executeScript(function() {
        return null === window.wrappedJSObject.document
          .querySelector('.appWindow.fullscreen-app.active.render');
      });
      assert.ok(notShownYet);
      lockScreen.slideToOpenCamera(resolve);
    })
    .then(function() {
      client.waitFor(function() {
        var theCameraApp = client.executeScript(function() {
          return window.wrappedJSObject.document
            .querySelector('.appWindow.fullscreen-app.active.render');
        });
        if (theCameraApp) {
          return theCameraApp.displayed();
        } else {
          return false;
        }
      });
    })
    .then(done)
    .catch(done);
  });

});
