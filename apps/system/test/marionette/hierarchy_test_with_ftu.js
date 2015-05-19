'use strict';
(function() {
  var assert = require('chai').assert;
  var System = require('./lib/system');
  var FxASystemDialog = require('./lib/fxa_system_dialog');

  marionette('hierarchyManager', function() {
    var client = marionette.client({
      profile: {
        settings: {
          'lockscreen.enabled': true
        }
      }
    });

    var getWindowName = function() {
      client.switchToFrame();
      return client.executeScript(function() {
        return window.wrappedJSObject.core
                     .hierarchyManager.getTopMostWindow().name;
      });
    };

    var getActiveAppWindowState = function() {
      client.switchToFrame();
      return client.executeScript(function() {
        return window.wrappedJSObject
                     .appWindowManager.getActiveWindow().isActive();
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
        window.wrappedJSObject.core.hierarchyManager.dumpHierarchy();
        return window.wrappedJSObject.core.hierarchyManager.getTopMostUI().name;
      });
    };

    var system = new System(client);
    var fxASystemDialog = new FxASystemDialog(client);

    setup(function() {
      system.waitForStartup();
    });

    suite('Test aria-hidden and top most UI', function() {
      test('Invoke system dialog', function() {
        fxASystemDialog.show();
        assert.equal(getTopMost(), 'SystemDialogManager');
        assert.equal(getActiveAppWindowAriaHidden(), 'true');
        system.goHome();
        assert.equal(getTopMost(), 'AppWindowManager');
        assert.equal(getActiveAppWindowAriaHidden(), 'false');
        assert.equal(getWindowName(), 'FTU');
      });
    });

    suite('home event', function() {
      test('Press home while running ftu', function() {
        assert.equal(getWindowName(), 'FTU');
        system.goHome();
        assert.equal(getWindowName(), 'FTU');
      });
    });

    suite('holdhome event', function() {
      test('Press holdhome', function() {
        assert.isTrue(getActiveAppWindowState());
        system.holdHome();
        assert.isTrue(getActiveAppWindowState());
      });
    });
  });
}());
