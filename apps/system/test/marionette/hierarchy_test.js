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

  marionette('hierarchyManager', function() {
    var apps = {};
    apps['activitycaller.gaiamobile.org'] = __dirname + '/activitycaller';
    apps['activitycallee.gaiamobile.org'] = __dirname + '/activitycallee';
    apps[FakeDialerApp.DEFAULT_ORIGIN] = __dirname + '/fakedialerapp';
    var client = marionette.client({
      settings: {
        'ftu.manifestURL': null,
        'lockscreen.enabled': false
      },
      apps: apps
    });

    var getWindowName = function() {
      client.switchToFrame();
      return client.executeScript(function() {
        return window.wrappedJSObject.core
                     .hierarchyManager.getTopMostWindow().name;
      });
    };

    var getWindowType = function() {
      client.switchToFrame();
      return client.executeScript(function() {
        return window.wrappedJSObject.core
                     .hierarchyManager.getTopMostWindow().CLASS_NAME;
      });
    };

    var getActiveAppWindowAriaHidden = function() {
      client.switchToFrame();
      return client.executeScript(function() {
        return window.wrappedJSObject
                     .appWindowManager.getActiveWindow().getTopMostWindow()
                     .element.getAttribute('aria-hidden');
      });
    };

    var getTopMost = function() {
      client.switchToFrame();
      return client.executeScript(function() {
        return window.wrappedJSObject.core.hierarchyManager.getTopMostUI().name;
      });
    };

    var system;
    var utilityTray = new UtilityTray(client);
    var rocketbar = new Rocketbar(client);
    var fxASystemDialog = new FxASystemDialog(client);
    var lockscreen = new Lockscreen();
    lockscreen.start(client);
    var taskManager = new TaskManager(client);
    var fakeDialerApp = new FakeDialerApp(client);

    setup(function() {
      system = client.loader.getAppClass('system');
      system.waitForStartup();
    });

    test('Lockscreen window is active', function() {
      // We can only enable the lockscreen here because it will eat all
      // |home| events, even unlocked
      // https://bugzilla.mozilla.org/show_bug.cgi?id=1098370
      lockscreen.setEnable(true);
      client.apps.launch('app://' + CALLER_APP);
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
      client.apps.launch('app://' + CALLER_APP);
      client.apps.switchToApp('app://' + CALLER_APP);
      client.findElement('#testchainactivity').click();
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
      client.apps.launch('app://' + CALLER_APP);
      assert.equal(getTopMost(), 'AppWindowManager');
      assert.equal(getWindowName(), 'Fake Activity Caller');
      assert.equal(getActiveAppWindowAriaHidden(), 'false');
    });

    test('Launch an app and pull down utility tray', function() {
      client.apps.launch('app://' + CALLER_APP);
      utilityTray.open();
      assert.equal(getTopMost(), 'UtilityTray');
      assert.equal(getActiveAppWindowAriaHidden(), 'true');
      utilityTray.close();
      assert.equal(getTopMost(), 'AppWindowManager');
      assert.equal(getActiveAppWindowAriaHidden(), 'false');
    });

    test('Invoke rocketbar', function() {
      assert.equal(getTopMost(), 'AppWindowManager');
      rocketbar.homescreenFocus();
      rocketbar.goThroughPermissionPrompt();
      assert.equal(getTopMost(), 'Rocketbar');
      assert.equal(getActiveAppWindowAriaHidden(), 'true');
      rocketbar.cancel.click();
      client.waitFor(function() {
        return getTopMost() === 'AppWindowManager';
      });
      assert.equal(getActiveAppWindowAriaHidden(), 'false');
    });

    test('Launch an app and invoke task manager', function() {
      client.apps.launch('app://' + CALLER_APP);
      taskManager.show();
      assert.equal(getActiveAppWindowAriaHidden(), 'true');
      taskManager.hide();
      assert.equal(getActiveAppWindowAriaHidden(), 'false');
    });
  });
}());
