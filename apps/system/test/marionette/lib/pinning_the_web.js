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
    pinSiteButton: '#pin-page-dialog button[data-action="pin-site"]',
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

  openAndPinSite: function openAndPinSite(url) {
    this.rocketbar.homescreenFocus();
    this.rocketbar.enterText(url, true);
    this.client.switchToFrame();
    this.client.scope({ searchTimeout: 100 }).waitFor(function() {
      this.client.switchToFrame();
      try {
        this.system.siteIcon.tap();
      } catch(e) {
        return false;
      }
      return true;
    }.bind(this));
    this.system.pinButton.tap();
  },

  openAndPinSiteFromBrowser: function openAndPinSite(url) {
    this.rocketbar.homescreenFocus();
    this.rocketbar.enterText(url, true);
    this.client.switchToFrame();
    this.client.scope({ searchTimeout: 100 }).waitFor(function() {
      this.client.switchToFrame();
      try {
        this.system.appChromeContextLink.tap();
      } catch(e) {
        return false;
      }
      return true;
    }.bind(this));
    this.system.appChromeContextMenuPin.tap();
    this.client.waitFor(function() {
      return this.pinDialog.displayed();
    }.bind(this));

    this.sitePanelArrow.tap();
    this.pinSiteButton.tap();
  },

  openAndPinPage: function openAndPinSite(url) {
    this.rocketbar.homescreenFocus();
    this.rocketbar.enterText(url, true);
    this.client.switchToFrame();
    this.client.scope({ searchTimeout: 100 }).waitFor(function() {
      this.client.switchToFrame();
      try {
        this.system.appChromeContextLink.tap();
      } catch(e) {
        return false;
      }
      return true;
    }.bind(this));
    this.system.appChromeContextMenuPin.tap();
    this.client.waitFor(function() {
      return this.pinDialog.displayed();
    }.bind(this));

    this.pinPageButton.tap();
  }

};

module.exports = PinningTheWeb;
