'use strict';

/**
 * A Marionette test helper for app installation flow.
 */

/**
 * @constructor
 * @param {Marionette.Client} client Marionette client to use.
 */
function AppInstall(client) {
  this.client = client.scope({ searchTimeout: 200000 });
}

module.exports = AppInstall;

AppInstall.prototype = {

  _install: function(type, manifestURL) {
    this.client.executeScript(function install(type, url) {
      window.wrappedJSObject.navigator.mozApps[type](url);
    }, [type, manifestURL]);
  },

  /**
   * Install an app.
   * @param {string} manifestURL The manifestURL of the app to be installed.
   * @param {Object} [options] The options for installation.
   */
  installPackage: function install(manifestURL) {
    return this._install('installPackage', manifestURL);
  },

  /**
   * Install an app.
   * @param {string} manifestURL The manifestURL of the app to be installed.
   * @param {Object} [options] The options for installation.
   */
  install: function install(manifestURL) {
    return this._install('install', manifestURL);
  },

  /**
   * Uninstall an app.
   * @param {string} [manifestURL] The manifestURL of the app.
   */
  uninstall: function(manifestURL) {
    this.client.switchToFrame();

    this.client.executeAsyncScript(function uninstall(url) {
      var win = window.wrappedJSObject;
      var mgmt = win.navigator.mozApps.mgmt;

      mgmt.getAll().onsuccess = function(e) {
        var app = e.target.result.find(function(app) {
          return app.manifestURL === url;
        });

        mgmt.uninstall(app);
        marionetteScriptFinished();
      };
    }, [manifestURL]);
  },

  /**
  Checks for downloads without applying them.
  */
  stageUpdate: function(manifestURL) {
    // do it in chrome so we don't need to switch contexts...
    var client = this.client.scope({ context: 'chrome' });
    return client.executeAsyncScript(function(manifestURL) {
      navigator.mozApps.mgmt.getAll().onsuccess = function(e) {
        var list = e.target.result;
        var app = list.find(function(app) {
          return app.manifestURL === manifestURL;
        });
        var req = app.checkForUpdate();
        req.onsuccess = req.onerror = function() {
          marionetteScriptFinished();
        };
      };
    }, [manifestURL]);
  },

  /**
  Updates an installed app by it's manifest url.

  @param {String} manifestURL for the application.
  */
  update: function(manifestURL) {
    // do it in chrome so we don't need to switch contexts...
    var client = this.client.scope({ context: 'chrome' });
    return client.executeAsyncScript(function(manifestURL) {
      navigator.mozApps.mgmt.getAll().onsuccess = function(e) {
        var list = e.target.result;
        var app = list.find(function(app) {
          return app.manifestURL === manifestURL;
        });

        var req = app.checkForUpdate();
        req.onsuccess = function() {
          app.download();
          marionetteScriptFinished();
        };

        req.onerror = function() {
          marionetteScriptFinished();
        };
      };
    }, [manifestURL]);
  }
};
