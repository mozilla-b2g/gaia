var fs = require('fs'),
    util = require('util');

function PerfApp(client, origin) {
  if(excludedApps.indexOf(origin) !== -1) {
    this.client = null;
    this.origin = null;
    this.skip = true;
    if (process.env.VERBOSE) {
      console.log("'" + origin +
		  "' is an excluded app, skipping tests.");
    }
    return;
  }
  var arr = mozTestInfo.appPath.split('/');
  manifestPath = arr[0];
  entryPoint = arr[1];

  origin = util.format('app://%s.gaiamobile.org',
		       manifestPath);
  this.client = client;
  this.origin = origin;
  this.skip = false;
}

module.exports = PerfApp;

PerfApp.prototype = {

  /**
   * Launches app, switches to frame, and waits for it to be loaded.
   */
  launch: function() {
    this.client.apps.launch(this.origin);
    this.client.apps.switchToApp(this.origin);
    this.client.helper.waitForElement('body');
  },

  close: function() {
    this.client.apps.close(this.origin);
  },

  unlock: function() {
/*
    var client = this.client;
    client.importScript(
      './tests/atoms/gaia_lock_screen.js',
      function() {
        client.executeJsScript('GaiaLockScreen.unlock()',
				  client.defaultCallback);
      });
*/
  }

};
