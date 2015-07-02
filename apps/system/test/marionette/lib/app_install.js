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

AppInstall.Selector = Object.freeze({
  // General app install dialog
  installDialog: '#app-install-dialog',
  installButton: '#app-install-install-button',
  // Setup dialog after installation
  setupDialog: '#setup-installed-app-dialog',
  setupButton: '#setup-confirm-button',
  // Ime Layout selection menu
  imeDialog: '#ime-layout-dialog',
  imeLayoutOption: '#ime-list li',
  imeConfirmButton: '#ime-confirm-button'
});

AppInstall.prototype = {

  get installDialog() {
    return this.client.findElement(AppInstall.Selector.installDialog);
  },

  get installButton() {
    return this.client.findElement(AppInstall.Selector.installButton);
  },

  get setupDialog() {
    return this.client.findElement(AppInstall.Selector.setupDialog);
  },

  get setupButton() {
    return this.client.findElement(AppInstall.Selector.setupButton);
  },

  get imeDialog() {
    return this.client.findElement(AppInstall.Selector.imeDialog);
  },

  get imeLayoutOption() {
    return this.client.findElement(AppInstall.Selector.imeLayoutOption);
  },

  get imeConfirmButton() {
    return this.client.findElement(AppInstall.Selector.imeConfirmButton);
  },

  _install: function(type, manifestURL, options) {
    this.client.executeScript(function install(type, url) {
      window.wrappedJSObject.navigator.mozApps[type](url);
    }, [type, manifestURL]);

    options = options || { allowInstall: true };
    if (options.allowInstall) {
      this.waitForDialog(this.installDialog);
      // Wait for the install button visible both to user and the screen reader.
      this.client.helper.waitForElement(this.installButton);
      // Click install button on the app install dialog
      this.installButton.click();
    }
  },

  /**
   * Install an app.
   * @param {string} manifestURL The manifestURL of the app to be installed.
   * @param {Object} [options] The options for installation.
   * @param {boolean} [options.allowInstall=true] If true, allow the
   * installation directly.
   */
  installPackage: function install(manifestURL, options) {
    return this._install('installPackage', manifestURL, options);
  },

  /**
   * Install an app.
   * @param {string} manifestURL The manifestURL of the app to be installed.
   * @param {Object} [options] The options for installation.
   * @param {boolean} [options.allowInstall=true] If true, allow the
   * installation directly.
   */
  install: function install(manifestURL, options) {
    return this._install('install', manifestURL, options);
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
  },

  /**
   * Wait for the specified dialog to show up.
   * @param {Marionette.Element} element The dialog element to wait for.
   */
  waitForDialog: function waitForAppInstallDialog(element) {
    this.client.waitFor(function() {
      var dialogClass = element.getAttribute('class');
      return dialogClass.indexOf('visible') != -1;
    });
  }
};
