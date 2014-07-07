'use strict';

var fs = require('fs');

var Helper = {

  unlockScreen: function(client) {
    // wait for the lockscreen to be ready
    client.waitFor(function() {
      return client.executeScript(function() {
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

  delay: function(client, interval, givenCallback) {
    var start = Date.now();

    client.waitFor(function(callback) {
      callback(null, Date.now() - start >= interval ? true : null);
    }, null, givenCallback);
  }
};

module.exports = Helper;
