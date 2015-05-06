'use strict';
/* global module */

var Rocketbar = require('./rocketbar');

function Bookmark(client) {
  this.client = client;
  this.rocketbar = new Rocketbar(client);
  this.search = client.loader.getAppClass('search');
  this.system = client.loader.getAppClass('system');
}

Bookmark.prototype = {

  Selectors: {
    'bookmarkAddButton': '#done-button',
    'bookmarkTitle': '#bookmark-title',
    'mozbrowser': '.inline-activity.active iframe[mozbrowser]',
    'appInstallationSection': '#app-installation',
    'installAppButton': '#install-app-button',
    'appName': '#app-name',
    'appIcon': '#app-icon'
  },

  get addButton() {
    return this.client.findElement(
      this.Selectors.bookmarkAddButton);
  },

  get currentTabFrame() {
    return this.client.helper.waitForElement(
      this.Selectors.mozbrowser);
  },

  get bookmarkTitle() {
    return this.client.helper.waitForElement(
      this.Selectors.bookmarkTitle);
  },

  get installAppButton() {
    return this.client.helper.waitForElement(
      this.Selectors.installAppButton);
  },

  get appName() {
    return this.client.helper.waitForElement(
      this.Selectors.appName);
  },

  get appIcon() {
    return this.client.helper.waitForElement(
      this.Selectors.appIcon);
  },

  /**
   * Switches to the bookmark activity and adds the current bookmark.
   * Switches back to the system app upon completion.
   */
  add: function() {
    this.client.switchToFrame(this.currentTabFrame);
    this.addButton.click();

    this.client.switchToFrame();
    this.client.helper.waitForElementToDisappear(this.currentTabFrame);
  },

  /**
   * Navigates to a given url from the homescreen
   * and saves it as a bookmark.
   */
  openAndSave: function(url) {
    this.rocketbar.homescreenFocus();
    this.rocketbar.enterText(url + '\uE006');

    this.system.appChromeContextLink.click();
    this.system.appChromeContextMenuBookmark.click();

    this.add();
  },

  /**
   * Navigates to a given url from the homescreen
   * and currently just looks for install section with correct app name.
   */
  openAndInstall: function(url, name, iconURL) {
    this.rocketbar.homescreenFocus();
    this.rocketbar.enterText(url + '\uE006');

    this.system.appChromeContextLink.click();
    this.system.appChromeContextMenuBookmark.click();

    this.client.switchToFrame(this.currentTabFrame);
    this.client.waitFor((function() {
      console.log('BTF ' + this.appIcon.getAttribute('src'));
      return this.appName.text() == name &&
        this.appIcon.displayed &&
        this.appIcon.getAttribute('src').indexOf(iconURL) != -1;
    }).bind(this));
  },

  /**
   * Renames a bookmark and emulates pressing the 'enter' key after doing so.
   */
  renameAndPressEnter: function(newName) {
    this.client.switchToFrame(this.currentTabFrame);
    this.bookmarkTitle.clear();
    this.bookmarkTitle.sendKeys(newName + '\uE006');
    this.addButton.click();

    this.client.switchToFrame();
    this.client.helper.waitForElementToDisappear(this.currentTabFrame);
  }
};

module.exports = Bookmark;
