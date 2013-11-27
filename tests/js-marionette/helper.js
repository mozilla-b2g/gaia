'use strict';

var fs = require('fs');

var Helper = {

  unlockScreen: function(client) {
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
