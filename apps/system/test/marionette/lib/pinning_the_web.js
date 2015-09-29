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

  _openUrl: function openUrl(url) {
    console.log('PinTheWeb _openUrl');
    // this.system.tapHome();
    console.log('tapped home, next homescreenFocus');
    this.rocketbar.homescreenFocus();
    console.log('homescreenFocus-ed, next enterText: ' + url);
    this.rocketbar.enterText(url, true);
    console.log('entered test, next switchToBrowserFrame');
    this.rocketbar.switchToBrowserFrame(url);
    console.log('switched ToBrowserFrame, switch back to frame');
    this.client.switchToFrame();
    console.log('/_openUrl');
  },

  openAndPinSite: function openAndPinSite(url) {
    console.log('openAndPinSite, calling _openUrl');
    this._openUrl(url);
    console.log('openAndPinSite, /_openUrl');
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

  openAndUnpinSite: function openAndUnpinSite(url) {
    var client = this.client;
    var system = this.system;
    this._openUrl(url);
    //Twice, one for expanding
    system.siteIcon.tap();
    system.siteIcon.tap();
    client.waitFor(function() {
      return system.pinButton.displayed();
    });
    system.pinButton.tap();
    client.waitFor(function() {
      var toast = client.findElement('#screen > gaia-toast');
      return toast && toast.displayed();
    });
  },

  openAndPinSiteFromBrowser: function openAndPinSite(url) {
    this._openUrl(url);
    this._clickPinContextMenu();
    this.client.waitFor(function() {
      return this.pinDialog.displayed();
    }.bind(this));
    this.sitePanelArrow.tap();
    this.pinSiteButton.tap();
  },

  openAndPinPage: function openAndPinSite(url) {
    this._openUrl(url);
    this._clickPinContextMenu();
    this.client.waitFor(function() {
      return this.pinDialog.displayed();
    }.bind(this));
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
    this.client.waitFor(function() {
      try {
        this.system.appChromeContextLink.tap();
      } catch (e) {
        return false;
      }
      return true;
    }.bind(this));

    var selector = this.system.Selector.appChromeContextMenuPin;
    var scopedClient = this.client.scope({searchTimeout: 100});
    scopedClient.findElement(selector, function(err, element) {
      if (err) {
        this.system.appChromeContextMenuCancel.tap();
        this._clickPinContextMenu();
      }
        this.system.appChromeContextMenuPin.tap();
    }.bind(this));
  }
};

module.exports = PinningTheWeb;
