'use strict';

var Settings = require('../app/app'),
    SystemApp = require('../app/system_app'),
    assert = require('assert');

marionette('manipulate display settings', function() {
  var client = marionette.client();
  var settingsApp, systemApp;
  var displayPanel;

  setup(function() {
    systemApp = new SystemApp(client);
    settingsApp = new Settings(client);
    settingsApp.launch();
    // Navigate to the display menu
    displayPanel = settingsApp.displayPanel;
  });

  suite('lock orientation', function() {
    test('check default value', function() {
      assert.ok(
        !displayPanel.isLockOrientationChecked,
        'lock orientation is disabled by default'
      );
    });

    test('tap toggle', function() {
      displayPanel.tapLockOrientationCheckbox();
      client.waitFor(function() {
        return displayPanel.isLockOrientationChecked;
      }.bind(this));

      assert.ok(
        displayPanel.isLockOrientationChecked,
        'lock orientation is enabled'
      );
      assert.ok(
        displayPanel.screenOrientationSetting,
        'screen.orientation.lock is true'
      );
    });
  });

  suite('change wallpaper', function() {
    test('tap wallpaper', function() {
      displayPanel.tapWallpaper();
      assert.ok(
        systemApp.isActionMenuVisible(),
        'action menu shows up'
      );
    });
  });

  suite('adjust brightness automatically', function() {
    var defaultAutoBrightnessEnabled;

    test('show the toggle when with light sensor', function() {
      client.executeScript(function() {
        var theWindow = window.wrappedJSObject;
        theWindow.loadJSON = function(path, callback) {
          setTimeout(function() {
            callback({ ambientLight: true });
          });
        };
        theWindow.Display.init();
      });
      assert.ok(displayPanel.isAutoBrightnessItemVisible);
    });

    test('hide the toggle when without light sensor', function() {
      client.executeScript(function() {
        var theWindow = window.wrappedJSObject;
        theWindow.loadJSON = function(path, callback) {
          setTimeout(function() {
            callback({ ambientLight: false });
          });
        };
        theWindow.Display.init();
      });
      assert.ok(!displayPanel.isAutoBrightnessItemVisible);
    });

    test('check default value', function() {
      // get the auto brightness value from mozSettings
      defaultAutoBrightnessEnabled =
        displayPanel.autoBrightnessSetting || false;
      assert.ok(
        displayPanel.isAutoBrightnessChecked === defaultAutoBrightnessEnabled,
        'default adjust automatically enabled: ' + defaultAutoBrightnessEnabled
      );
    });

    test('tap toggle', function() {
      displayPanel.tapAutoBrightnessCheckbox();
      client.waitFor(function() {
        return displayPanel.isAutoBrightnessChecked;
      }.bind(this));

      assert.ok(
        displayPanel.isAutoBrightnessChecked !== defaultAutoBrightnessEnabled,
        'adjust automatically enabled: ' + !defaultAutoBrightnessEnabled
      );
      assert.ok(displayPanel.autoBrightnessSetting !==
        defaultAutoBrightnessEnabled);

      var expectedVisibility = !displayPanel.isAutoBrightnessChecked;
      assert.ok(
        displayPanel.isBrightnessManualItemVisible === expectedVisibility,
        'manual brightness item visibility: ' + expectedVisibility
      );
    });
  });

  suite('screen timeout', function() {
    // Skip the test as currently we are not able to tap on a select element.
    // Please refer to bug 977522 for details.
    test.skip('tap selector', function() {
      displayPanel.tapScreenTimeoutSelector();
      assert.ok(
        systemApp.isValueSelectorVisible(),
        'screen timeout selector shows up'
      );
    });

    test('tap screen timeout option', function() {
      displayPanel.tapScreenTimeoutSelectOption('1 minute');
      assert.ok(displayPanel.screenTimeoutSetting === 60);

      displayPanel.tapScreenTimeoutSelectOption('2 minutes');
      assert.ok(displayPanel.screenTimeoutSetting === 120);

      displayPanel.tapScreenTimeoutSelectOption('5 minutes');
      assert.ok(displayPanel.screenTimeoutSetting === 300);

      displayPanel.tapScreenTimeoutSelectOption('10 minutes');
      assert.ok(displayPanel.screenTimeoutSetting === 600);

      displayPanel.tapScreenTimeoutSelectOption('never');
      assert.ok(displayPanel.screenTimeoutSetting === 0);
    });
  });
});
