'use strict';
/* global module */

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

AppInstall.prototype.selectors = {
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
};

/**
 * Wait for the specified dialog to show up.
 * @param {Marionette.Element} element The dialog element to wait for.
 */
AppInstall.prototype.waitForDialog =
  function waitForAppInstallDialog(element) {
    this.client.waitFor(function() {
      var dialogClass = element.getAttribute('class');
      return dialogClass.indexOf('visible') != -1;
    });
  };

/*
 * Create properties for getting the element in app install flow.
 */
function createGetter(prop) {
  return function() {
    return this.client.findElement(this.selectors[prop]);
  };
}

for (var prop in AppInstall.prototype.selectors) {
  Object.defineProperty(AppInstall.prototype, prop, {
        get: createGetter(prop)
    });
}
