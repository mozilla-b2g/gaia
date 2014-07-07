'use strict';

var fs = require('fs');

var Helper = {

  unlockScreen: function(client) {
    // wait that the lockscreen is ready
    client.waitFor(function () {
      return client.executeScript(function () {
        var ok = (window != null &&
                  window.wrappedJSObject.lockScreenWindowManager != null);
        if (ok) {
          var lockScreen = window.wrappedJSObject.lockScreen ||
            window.wrappedJSObject.LockScreen;
          if (lockScreen) {
            return typeof lockScreen.unlock === "function";
          }
        }
        return ok;
      });
    });
    client.executeScript(fs.readFileSync('./tests/atoms/gaia_lock_screen.js') +
                         'GaiaLockScreen.unlock();\n');
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
