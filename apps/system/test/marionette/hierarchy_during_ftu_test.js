'use strict';
(function() {
  var assert = require('chai').assert;
  var Lockscreen = require('./lib/lockscreen');

  marionette('hierarchyManager with FTU', function() {
    var client = marionette.client({
      profile: {
        settings: {
          'lockscreen.enabled': true,
          'ftu.manifestURL': 'app://ftu.gaiamobile.org/manifest.webapp'
        }
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

    var system;
    var lockscreen = new Lockscreen();
    lockscreen.start(client);

    setup(function() {
      system = client.loader.getAppClass('system');
      system.waitForFullyLoaded();
      lockscreen.unlock();
    });

    suite('home events', function() {
      test('Press home while running ftu', function() {
        assert.equal(getWindowName(), 'FTU');
        assert.isTrue(getActiveAppWindowState());
        system.tapHome();
        assert.equal(getWindowName(), 'FTU');
        assert.isTrue(getActiveAppWindowState());
      });

      test('Hold home while running fty', function() {
        assert.equal(getWindowName(), 'FTU');
        assert.isTrue(getActiveAppWindowState());
        system.holdHome();
        assert.equal(getWindowName(), 'FTU');
        assert.isTrue(getActiveAppWindowState());
      });
    });
  });
}());
