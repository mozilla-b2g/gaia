'use strict';
(function() {
  var assert = require('chai').assert;
  var System = require('./lib/system');
  var FxASystemDialog = require('./lib/fxa_system_dialog');

  marionette('hierarchyManager', function() {
    var client = marionette.client({
      settings: {
        'lockscreen.enabled': true
      }
    });

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

    var getActiveAppWindowAriaHidden = function() {
      client.switchToFrame();
      return client.executeScript(function() {
        return window.wrappedJSObject.Service
                     .query('AppWindowManager.getActiveWindow').getTopMostWindow()
                     .element.getAttribute('aria-hidden');
      });
    };

    var getTopMost = function() {
      client.switchToFrame();
      return client.executeScript(function() {
        return window.wrappedJSObject.Service.query('getTopMostUI').name;
      });
    };

    var system = new System(client);
    var fxASystemDialog = new FxASystemDialog(client);

    setup(function() {
      system.waitForFullyLoaded();
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
