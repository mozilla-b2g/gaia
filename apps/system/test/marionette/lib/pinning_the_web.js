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
    console.log('1 1');
    this.rocketbar.homescreenFocus();
    console.log('1 2');
    this.rocketbar.enterText(url, true);
    console.log('1 3');
    this.system.gotoBrowser(url);
    console.log('1 4');
    this.client.switchToFrame();
    console.log('1 5');
    this.client.scope({ searchTimeout: 100 }).waitFor(function() {
      this.client.switchToFrame();
      try {
        console.log('1 6');
        this.system.siteIcon.tap();
      } catch(e) {
        return false;
      }
      return true;
    }.bind(this));
    console.log('1 7');
    this.system.pinButton.tap();
  },

  openAndPinSiteFromBrowser: function openAndPinSite(url) {
    console.log('2 1');
    this.rocketbar.homescreenFocus();
    console.log('2 2');
    this.rocketbar.enterText(url, true);
    console.log('2 3');
    this.system.gotoBrowser(url);
    console.log('2 4');
    this._clickPinContextMenu();
    console.log('2 5');
    this.client.waitFor(function() {
      return this.pinDialog.displayed();
    }.bind(this));
    console.log('2 6');
    this.sitePanelArrow.tap();
    console.log('2 7');
    this.pinSiteButton.tap();
  },

  openAndPinPage: function openAndPinSite(url) {
    console.log('3 1');
    this.rocketbar.homescreenFocus();
    console.log('3 2');
    this.rocketbar.enterText(url, true);
    console.log('3 3');
    this.system.gotoBrowser(url);
    console.log('3 4');
    this._clickPinContextMenu();
    console.log('3 5');
    this.client.waitFor(function() {
      return this.pinDialog.displayed();
    }.bind(this));
    console.log('3 6');
    this.pinPageButton.tap();
  },

  _clickPinContextMenu: function() {
    this.client.switchToFrame();
    console.log('4 1');
    this.client.waitFor(function() {
      try {
        console.log('4 2');
        this.system.appChromeContextLink.tap();
      } catch(e) {
        return false;
      }
      return true;
    }.bind(this));

    var selector = this.system.Selector.appChromeContextMenuPin;
    var scopedClient = this.client.scope({searchTimeout: 100});
    console.log('4 3');
    scopedClient.findElement(selector, function(err, element) {
      if (err) {
        console.log('4 4');
        this.system.appChromeContextMenuCancel.tap();
        this._clickPinContextMenu();
      }
        console.log('4 5');
        this.system.appChromeContextMenuPin.tap();
    }.bind(this));
  }
};

module.exports = PinningTheWeb;
