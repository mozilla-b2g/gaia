'use strict';
/* global module, require */

var fs = require('fs');

var Helper = {

  unlockScreen: function(client) {
    // wait that the lockscreen is ready
    client.waitFor(function () {
      return client.executeScript(function () {
        if (!window || !window.wrappedJSObject.lockScreenWindowManager) {
          return true;
        }

        var wrappedObject = window.wrappedJSObject;
        var lockScreen = wrappedObject.lockScreen || wrappedObject.LockScreen;

        return typeof lockScreen.unlock === 'function';
      });
    });
    client.executeScript(
      fs.readFileSync('./tests/atoms/gaia_lock_screen.js') +
        'GaiaLockScreen.unlock();\n');
  },

  lockScreen: function(client) {
    // wait that the lockscreen is ready
    client.waitFor(function () {
      return client.executeScript(function () {
        if (!window || !window.wrappedJSObject.lockScreenWindowManager) {
          return true;
        }

        var wrappedObject = window.wrappedJSObject;
        var lockScreen = wrappedObject.lockScreen || wrappedObject.LockScreen;

        return typeof lockScreen.lock === 'function';
      });
    });
    client.executeScript(
      fs.readFileSync('./tests/atoms/gaia_lock_screen.js') +
        'GaiaLockScreen.lock();\n');
  },

  delay: function(client, interval, givenCallback) {
    var start = Date.now();
    client.waitFor(function(callback) {
      if (Date.now() - start >= interval) {
        callback(null, true);
      } else {
        callback(null, null);
      }
    }, null, givenCallback);
  }
};

module.exports = Helper;
