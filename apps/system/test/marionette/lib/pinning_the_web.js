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
    pinPageButton: '#pin-page-dialog button[data-action="pin"]',
    pinSiteButton: '#pin-page-dialog button.site-panel-element',
    sitePanelArrow: '#pin-page-dialog .icon-arrow'
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

  get sitePanelArrow() {
    return this.client.helper.waitForElement(this.Selectors.sitePanelArrow);
  },

  _openUrl: function openUrl(url) {
    this.rocketbar.homescreenFocus();
    this.rocketbar.enterText(url, true);
    this.rocketbar.switchToBrowserFrame(url);
    this.client.switchToFrame();
  },

  // Open a URL, tap on the site icon and tap the pin site button.
  openAndPinSite: function openAndPinSite(url) {
    this.rocketbar.homescreenFocus();
    this.rocketbar.enterText(url, true);
    this.system.gotoBrowser(url);
    this.client.switchToFrame();
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

  // Open a URL, open the pin dialog and tap the pin site button.
  openAndPinSiteFromBrowser: function openAndPinSite(url) {
    this._openUrl(url);
    this._clickPinContextMenu();
    this.sitePanelArrow.tap();
    this.pinSiteButton.tap();
    this.client.helper.waitForElementToDisappear(this.pinDialog);
  },

  // Open a URL, open the pin dialog and tap the unpin site button.
  openAndUnpinSiteFromBrowser: function openAndUnpinSiteFromBrowser(url) {
    this._openUrl(url);

    this.client.switchToFrame();

    // Tap to expand the browser chrome.
    this.system.appUrlbar.tap();
    this.client.waitFor(function() {
      return !this.chromeIsPinned();
    }.bind(this));

    this._clickPinContextMenu();
    this.sitePanelArrow.tap();
    this.pinSiteButton.tap();
    this.client.helper.waitForElementToDisappear(this.pinDialog);
  },

  // Open a URL, open the pin dialog and tap the pin/unpin page button.
  openAndPinPage: function openAndPinSite(url) {
    this._openUrl(url);
    this._clickPinContextMenu();
    this.pinPageButton.tap();
  },

  chromeIsPinned: function chromeIsPinned() {
    var classes = this.system.appChrome.getAttribute('class');
    var isMinimized = classes.indexOf('maximized') < 0;
    var notScrollable = classes.indexOf('collapsible') < 0;

    return isMinimized && notScrollable;
  },

  _clickPinContextMenu: function() {
    this.client.switchToFrame();
    this.system.appChromeContextLink.tap();
    var menu = this.system.appChromeContextMenu;
    this.system.appChromeContextMenuPin.tap();
    this.client.helper.waitForElementToDisappear(menu);
    this.client.helper.waitForElement(this.pinDialog);
  }
};

module.exports = PinningTheWeb;
