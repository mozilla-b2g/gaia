'use strict';
(function() {
  var assert = require('chai').assert;
  var UtilityTray = require('./lib/utility_tray');
  var Rocketbar = require('./lib/rocketbar');
  var FxASystemDialog = require('./lib/fxa_system_dialog');
  var Lockscreen = require('./lib/lockscreen');
  var TaskManager = require('./lib/task_manager');
  var CALLER_APP = 'activitycaller.gaiamobile.org';
  var FakeDialerApp = require('./lib/fakedialerapp.js');
  var ActivityCallerApp = require('./lib/activitycallerapp');

  marionette('hierarchyManager', function() {
    var apps = {};
    apps['activitycaller.gaiamobile.org'] =
      __dirname + '/../apps/activitycaller';
    apps['activitycallee.gaiamobile.org'] =
      __dirname + '/../apps/activitycallee';
    apps[FakeDialerApp.DEFAULT_ORIGIN] = __dirname + '/../apps/fakedialerapp';
    var client = marionette.client({
      profile: {
        settings: {
          'lockscreen.enabled': true
        },
        apps: apps,
        prefs: {
          'focusmanager.testmode': true
        }
      }
    });

    var getAppHeight = function(origin) {
      client.switchToFrame();
      client.apps.switchToApp(origin);
      return client.executeScript(function() {
        return window.wrappedJSObject.innerHeight;
      });
    };

    var getWindowName = function() {
      client.switchToFrame();
      return client.executeScript(function() {
        return window.wrappedJSObject.Service.query('getTopMostWindow').name;
      });
    };

    var getActiveAppWindowState = function() {
      client.switchToFrame();
      return client.executeScript(function() {
        return window.wrappedJSObject.Service
                     .query('AppWindowManager.getActiveWindow').isActive();
      });
    };

    var getWindowType = function() {
      client.switchToFrame();
      return client.executeScript(function() {
        return window.wrappedJSObject.Service.query('getTopMostWindow')
                     .CLASS_NAME;
      });
    };

    var getActiveAppWindowAriaHidden = function() {
      client.switchToFrame();
      return client.executeScript(function() {
        return window.wrappedJSObject.Service
                     .query('AppWindowManager.getActiveWindow')
                     .getTopMostWindow()
                     .element.getAttribute('aria-hidden');
      });
    };

    var getTopMost = function() {
      client.switchToFrame();
      return client.executeScript(function() {
        return window.wrappedJSObject.Service.query('getTopMostUI').name;
      });
    };

    var system;
    var utilityTray;
    var rocketbar = new Rocketbar(client);
    var fxASystemDialog = new FxASystemDialog(client);
    var lockscreen = new Lockscreen();
    lockscreen.start(client);
    var taskManager = new TaskManager(client);
    var fakeDialerApp = new FakeDialerApp(client);
    var activitycaller = new ActivityCallerApp(client);

    suite('Test aria-hidden and top most UI', function() {
      setup(function() {
        utilityTray = new UtilityTray(client);
        system = client.loader.getAppClass('system');
        system.waitForFullyLoaded();
        lockscreen.unlock();
      });


      test('Lockscreen window is active', function() {
        activitycaller.launch();
        lockscreen.lock();
        assert.equal(getTopMost(), 'LockScreenWindowManager');
        assert.equal(getActiveAppWindowAriaHidden(), 'true');
        assert.equal(getWindowType(), 'LockScreenWindow');
      });

      test('Attention window', function() {
        fakeDialerApp.launch();
        fakeDialerApp.waitForTitleShown(true);
        assert.equal(getWindowType(), 'AttentionWindow');
        assert.equal(getTopMost(), 'AttentionWindowManager');
      });

      test('Inline activity', function() {
        activitycaller.launch();
        activitycaller.startChainActivity();
        assert.equal(getWindowName(),
          'Fake Activity Callee with inline deposition');
        assert.equal(getTopMost(), 'AppWindowManager');
      });

      test('Invoke system dialog', function() {
        fxASystemDialog.show();
        assert.equal(getTopMost(), 'SystemDialogManager');
        assert.equal(getActiveAppWindowAriaHidden(), 'true');
        system.tapHome();
        assert.equal(getTopMost(), 'AppWindowManager');
        assert.equal(getActiveAppWindowAriaHidden(), 'false');
      });

      test('Launch an app', function() {
        activitycaller.launch();
        assert.equal(getTopMost(), 'AppWindowManager');
        assert.equal(getWindowName(), 'Fake Activity Caller');
        assert.equal(getActiveAppWindowAriaHidden(), 'false');
      });

      test('Launch an app and pull down utility tray', function() {
        client.apps.launch('app://' + CALLER_APP);
        utilityTray.open();
        assert.equal(getTopMost(), 'UtilityTray');
        // Don't blur current app when utilityTray is pulled down.
        assert.equal(getActiveAppWindowAriaHidden(), 'false');
        utilityTray.close();
        assert.equal(getTopMost(), 'AppWindowManager');
        assert.equal(getActiveAppWindowAriaHidden(), 'false');
      });

      test('Invoke rocketbar', function() {
        assert.equal(getTopMost(), 'AppWindowManager');
        rocketbar.homescreenFocus();
        assert.equal(getTopMost(), 'Rocketbar');
        assert.equal(getActiveAppWindowAriaHidden(), 'true');
        rocketbar.cancel.click();
        client.waitFor(function() {
          return getTopMost() === 'AppWindowManager';
        });
        assert.equal(getActiveAppWindowAriaHidden(), 'false');
      });

      test('Launch an app and invoke task manager', function() {
        activitycaller.launch();
        taskManager.show();
        assert.equal(getActiveAppWindowAriaHidden(), 'true');
        taskManager.hide();
        assert.equal(getActiveAppWindowAriaHidden(), 'false');
      });
    });

    suite('home event', function() {
      setup(function() {
        system = client.loader.getAppClass('system');
        system.waitForFullyLoaded();
        lockscreen.unlock();
      });

      test('Press home while active app is not home', function() {
        activitycaller.launch();
        system.tapHome();
        assert.equal(getWindowName(), 'Homescreen');
      });

      test('Lockscreen window is active', function() {
        activitycaller.launch();
        lockscreen.lock();
        system.tapHome();
        lockscreen.unlock();
        assert.equal(getWindowName(), 'Fake Activity Caller');
      });
    });

    suite('holdhome event', function() {
      setup(function() {
        system = client.loader.getAppClass('system');
        system.waitForFullyLoaded();
        lockscreen.unlock();
      });

      test('Press holdhome', function() {
        activitycaller.launch();
        system.holdHome();
        client.helper.wait(3000);
        assert.isFalse(getActiveAppWindowState());
      });

      test('Lockscreen window is active', function() {
        activitycaller.launch();
        lockscreen.lock();
        system.holdHome();
        lockscreen.unlock();
        assert.equal(getWindowName(), 'Fake Activity Caller');
        assert.isTrue(getActiveAppWindowState());
      });
    });

    suite('Value selector', function() {
      setup(function() {
        system = client.loader.getAppClass('system');
        system.waitForFullyLoaded();
        lockscreen.unlock();
      });

      test('Focus a date input in an app should trigger value selector',
        function() {
          activitycaller.launch();
          activitycaller.focusDateInput();

          client.helper.waitForElement('.appWindow .value-selector');
        });

      test('Focus a date input in system dialog should trigger value selector',
        function() {
          activitycaller.launch();
          fxASystemDialog.show();
          fxASystemDialog.goToCOPPA();
          fxASystemDialog.focusAge();
          client.switchToFrame();
          client.helper.waitForElement('.fxa-dialog .value-selector');
        });
    });

    test('Focus during init logo does not invoke keyboard', function() {
      fxASystemDialog.show();
      var h1 = fxASystemDialog.getHeight();
      fxASystemDialog.focus();
      var h2 = fxASystemDialog.getHeight();
      assert.equal(h1, h2);
    });

    suite('Keyboard resize', function() {
      setup(function() {
        system = client.loader.getAppClass('system');
        system.waitForFullyLoaded();
        lockscreen.unlock();
      });

      // XXX: See bug 1103944
      test.skip('App should not change its height when focusing attention',
        function() {
          fakeDialerApp.launch();
          var apph1 = getAppHeight(fakeDialerApp.origin);
          client.switchToFrame();
          var h1 = fakeDialerApp.getCallHeight();
          client.findElement('#input').click();
          client.switchToFrame();
          system.waitForKeyboard();
          var apph2 = getAppHeight(fakeDialerApp.origin);
          var h2 = fakeDialerApp.getCallHeight();
          assert.notEqual(h1, h2);
          assert.equal(apph1, apph2);
        });

      test('App with input is focused should change height', function() {
        activitycaller.launch();
        var h1 = getAppHeight('app://' + CALLER_APP);
        activitycaller.focusTextInput();
        system.waitForKeyboard();
        var h2 = getAppHeight('app://' + CALLER_APP);
        assert.notEqual(h1, h2);
      });

      test('App should not change its height if system dialog is focused',
        function() {
          activitycaller.launch();
          var h1 = getAppHeight('app://' + CALLER_APP);
          fxASystemDialog.show();
          var systemDialogHeight1 = fxASystemDialog.getHeight();
          fxASystemDialog.focus();
          client.switchToFrame();
          system.waitForKeyboard();

          var systemDialogHeight2 = fxASystemDialog.getHeight();
          var h2 = getAppHeight('app://' + CALLER_APP);
          assert.equal(h1, h2);
          assert.notEqual(systemDialogHeight1, systemDialogHeight2);
        });
    });
  });
}());
