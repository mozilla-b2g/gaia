'use strict';

marionette('LockScreen: ensure mozSettings API works', function() {
  var client = marionette.client({
    desiredCapabilities: { raisesAccessibilityExceptions: true }
  });
  var LockScreen = require('./lib/lockscreen.js');
  var lockScreen = (new LockScreen()).start(client);

  test('get lockscreen.enabled, and test if it get released', function() {
    client.executeScript(function() {
      var settings = window.wrappedJSObject.navigator.mozSettings;
      if (null === settings) {
        throw new Error('Can\'t get settings after previous session');
      }
      var lock = settings.createLock();
      var result = lock.set({
        'lockscreen.enabled': true
      });
      result.onsuccess = function() {
        var isReleased = lock.closed;
        if (!isReleased) {
          throw new Error('The lock isn\'t closed after onsuccess' +
            ' and previous session');
        }
      };
      result.onerror = function() {
        throw new Error('Get error while try to access the entry');
      };
    });

    client.executeScript(function() {
      var settings = window.wrappedJSObject.navigator.mozSettings;
      if (null === settings) {
        throw new Error('Can\'t get settings after previous session');
      }
      var lock = settings.createLock();
      var result = lock.get('lockscreen.enabled');
      result.onsuccess = function() {
        var isReleased = lock.closed;
        if (!isReleased) {
          throw new Error('The lock isn\'t closed after onsuccess' +
            ' and previous session');
        }
      };
      result.onerror = function() {
        throw new Error('Get error while try to access the entry');
      };
    });
  });

  test('test it can unlock and lock multiple times', function() {
    lockScreen.relock();
    for (var i = 0; i < 4; i ++) {
      lockScreen.unlock();
      lockScreen.lock();
    }
  });
});
