'use strict';
/* global module */

var Rocketbar = require('./rocketbar');

function PinningTheWeb(client) {
  this.client = client;
  this.rocketbar = new Rocketbar(client);
  this.system = client.loader.getAppClass('system');
}


PinningTheWeb.prototype = {
  Selectors: {
    pinDialog: '#pin-page-dialog',
    pinPageButton: '#pin-page-container gaia-button',
    pinSiteButton: '#pin-site-container gaia-button'
  },

  get pinDialog() {
    return this.client.helper.waitForElement(this.Selectors.pinDialog);
  },

  get pinPageButton() {
    return this.client.helper.waitForElement(this.Selectors.pinPageButton);
  },

  get pinSiteButton() {
    return this.client.helper.waitForElement(this.Selectors.pinSiteButton);
  },

  _openUrl: function openUrl(url) {
    this.client.switchToFrame();
    this.rocketbar.appTitleFocus();
    this.rocketbar.enterText(url, true);
    this.rocketbar.switchToBrowserFrame(url);
    this.client.switchToFrame();
  },

  // Open a URL, tap on the site icon and tap the pin site button.
  openAndPinSite: function openAndPinSite(url) {
    this.client.switchToFrame();
    this.rocketbar.appTitleFocus();
    this.rocketbar.enterText(url, true);
    this.system.gotoBrowser(url);
    this.client.scope({ searchTimeout: 100 }).waitFor(function() {
      this.client.switchToFrame();
      try {
        this.system.siteIcon.tap();
      } catch (e) {
        return false;
      }
      return true;
    }.bind(this));
    this.system.pinButton.tap();
    this.client.waitFor(function() {
      var toast = this.client.findElement('#screen > gaia-toast');
      return toast && toast.displayed();
    }.bind(this));
  },

  // Open Pin Dialog for URL.
  openPinDialog: function(url) {
    this._openUrl(url);
    this._clickPinContextMenu();
    this.client.helper.waitForElement(this.Selectors.pinDialog);
  },

  // Open a URL, open the pin dialog and tap the pin site button.
  openAndPinSiteFromBrowser: function openAndPinSite(url) {
    this._openUrl(url);
    this._clickPinContextMenu();
    // When running tests in mulet locally, part of the pin site button
    // is cut off at the bottom of the screen. To work around this we
    // tap the pin button in the upper left hand corner.
    this.pinSiteButton.click();
    this.client.helper.waitForElementToDisappear(this.pinDialog);
  },

  // Open a URL, open the pin dialog and tap the pin/unpin page button.
  openAndPinPage: function openAndPinPage(url) {
    this._openUrl(url);
    this._clickPinContextMenu();
    this.pinPageButton.click();
    this.client.helper.waitForElementToDisappear(this.pinDialog);
  },

  chromeIsPinned: function chromeIsPinned() {
    var classes = this.system.appChrome.getAttribute('class');
    var notScrollable = classes.indexOf('collapsible') < 0;

    return this.chromeisMinimized() && notScrollable;
  },

  chromeisMinimized: function chromeisMinimized() {
    var classes = this.system.appChrome.getAttribute('class');
    var isMinimized = classes.indexOf('maximized') < 0;

    return isMinimized;
  },

  _unpinChrome: function() {
    this.client.waitFor(function() {
      // Tap to expand the browser chrome.
      this.system.appUrlbar.tap();
      return !this.chromeisMinimized();
    }.bind(this));
  },

  _clickPinContextMenu: function() {
    this.client.switchToFrame();
    if (this.chromeisMinimized()) {
      this._unpinChrome();
    }
    this.system.appChromeContextLink.tap();
    var menu = this.system.appChromeContextMenu;
    this.system.appChromeContextMenuPin.tap();
    this.client.helper.waitForElementToDisappear(menu);
    this.client.helper.waitForElement(this.pinDialog);
  }
};

module.exports = PinningTheWeb;
