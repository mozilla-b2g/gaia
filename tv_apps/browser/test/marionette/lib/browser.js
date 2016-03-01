'use strict';
/* global module */

var system, actions;

function Browser(client) {
  this.client = client;
  system = client.loader.getAppClass('system');
  actions = client.loader.getActions();
}

/**
 * @type String Origin of search app
 */
Browser.URL = 'app://browser.gaiamobile.org';

Browser.Selectors = {
  fteSkip: '#fte-skip',
  fteSignin: '#fte-sign-in',
  urlInput: '#url-input',
  fte: '.fte-page',
  menuButton: '#menu-button',
  menuBlock: '#menu-button-block',
  historyButton: '#history-block',
  historyBlock: '#history',
  historyItems: '#history ul.smart-list-view > li',
  dialogArea: '#dialog-area',
  pinButton: '#pinhome-button'
};

Browser.prototype = {

  URL: Browser.URL,
  Selectors: Browser.Selectors,
  frame: null,

  get fteSkip() {
    return this.client.helper.waitForElement(this.Selectors.fteSkip);
  },

  get urlInput() {
    return this.client.helper.waitForElement(this.Selectors.urlInput);
  },

  get menuButton() {
    return this.client.helper.waitForElement(this.Selectors.menuButton);
  },

  get menuBlock() {
    return this.client.helper.waitForElement(this.Selectors.menuBlock);
  },

  get historyButton() {
    return this.client.helper.waitForElement(this.Selectors.historyButton);
  },

  get dialogArea() {
    return this.client.helper.waitForElement(this.Selectors.dialogArea);
  },

  get pinButton() {
    return this.client.helper.waitForElement(this.Selectors.pinButton);
  },

  get historyItems() {
    return this.client.findElements(this.Selectors.historyItems);
  },

  goTo: function(url) {
    this.urlInput.sendKeys(url + '\ue006');
  },

  goToHistory: function() {
    // Element not visible, scroll right
    var body = this.client.findElement('body');
    var menuButton = this.client.findElement(this.Selectors.menuButton);
    while (!menuButton.displayed()) {
      body.sendKeys(system.Keys.right);
    }

    this.menuButton.click();
    this.client.waitFor(function() {
      return this.menuButton.displayed();
    }.bind(this));
    this.historyButton.click();
  },

  skipFte: function() {
    this.sendEnter(this.fteSkip);
  },

  signIn: function() {
    this.sendEnter(this.fteSignin);
  },

  switchFrame: function() {
    this.client.switchToFrame(this.frame);
  },

  launch: function() {
    this.frame = system.waitForLaunch(this.URL);
    return this.frame;
  },

  goToUrlAndPin: function(url) {
    this.goTo(url);
    this.goToHistory();
    this.client.waitFor(function() {
      return this.historyItems && this.historyItems[0].displayed();
    }.bind(this));
    system.contextMenu(this.historyItems[0]);
    this.pinButton.click();
  },

  sendEnter: function(element) {
    element.sendKeys(system.Keys.enter);
  }
};

module.exports = Browser;
