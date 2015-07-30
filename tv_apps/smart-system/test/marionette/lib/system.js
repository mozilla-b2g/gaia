'use strict';

function System(client) {
  this.client = client.scope({
    searchTimeout: 20000
  });
}

module.exports = System;

System.URL = 'app://smart-system.gaiamobile.org/manifest.webapp';

System.Selector = Object.freeze({
  appChromeContextMenuContainer: '.appWindow.active .modal-dialog',
  appChromeContextMenuDialog: '.appWindow.active .contextmenu .modal-dialog',
  appInstallCancelButton: '.app-install-dialog smart-button:nth-child(1)',
  appInstallInstallButton: '.app-install-dialog smart-button:nth-child(2)',
  appCancelInstallConfirmButton:
      '.app-install-cancel-dialog smart-button:nth-child(1)',
  appCanelInstallResumeButton:
      '.app-install-cancel-dialog smart-button:nth-child(2)',
  appUninstallCancelButton: '.app-uninstall-dialog smart-button:nth-child(1)',
  appUninstallConfirmButton: '.app-uninstall-dialog smart-button:nth-child(2)',
  appInstallSetupLaterButton: '.setup-app-dialog smart-button:nth-child(1)',
  appInstallSetupNowButton: '.setup-app-dialog smart-button:nth-child(2)'
});

System.prototype = {
  client: null,

  URL: System.URL,

  Selector: System.Selector,

  get appChromeContextMenuContainer() {
    return this.client.helper.waitForElement(
      System.Selector.appChromeContextMenuContainer);
  },

  get appChromeContextMenu() {
    return this.client.helper.waitForElement(
      System.Selector.appChromeContextMenuDialog);
  },

  getAppIframe: function(url) {
    return this.client.findElement('iframe[src*="' + url + '"]');
  },

  getHomescreenIframe: function() {
    return this.client.findElement('#homescreen iframe');
  },

  waitForLaunch: function(url) {
    this.client.apps.launch(url);
    var iframe = this.getAppIframe(url);
    this.client.waitFor(function() {
      return iframe.displayed();
    });

    return iframe;
  },

  waitForEvent: function(evt) {
    this.client.switchToFrame();
    this.client.executeAsyncScript(function(evt) {
      var win = window.wrappedJSObject;
      win.addEventListener(evt, function trWait() {
        win.removeEventListener(evt, trWait);
        marionetteScriptFinished();
      });
    }, [evt]);
  },

  _waitForAppState: function(manifestURL, installed) {
    this.client.waitFor(function() {
      return this.client.executeScript(function(manifestURL, installed) {
        var apps = window.wrappedJSObject.applications;
        var hasApp = !!apps.installedApps[manifestURL];
        return hasApp === installed;
      }, [manifestURL, installed]);
    }.bind(this));
  },

  waitForAppInstalled: function(manifestURL) {
    return this._waitForAppState(manifestURL, true);
  },

  waitForAppUninstalled: function(manifestURL) {
    return this._waitForAppState(manifestURL, false);
  },

  isAppInstalled: function(manifestURL) {
    return this.client.executeScript(function(manifestURL) {
      return !!window.wrappedJSObject.applications.installedApps[manifestURL];
    }, [manifestURL]);
  },

  goHome: function() {
    this.client.switchToFrame();
    this.client.executeAsyncScript(function() {
      var win = window.wrappedJSObject;
      win.addEventListener('homescreenopened', function trWait() {
        win.removeEventListener('homescreenopened', trWait);
        marionetteScriptFinished();
      });
      win.dispatchEvent(new CustomEvent('home'));
    });
  },

  tapHome: function() {
    this.client.switchToFrame();
    this.client.executeScript(function() {
      window.wrappedJSObject.dispatchEvent(new CustomEvent('home'));
    });
  }
};
