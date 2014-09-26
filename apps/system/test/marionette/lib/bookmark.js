'use strict';
/* global module */

var Rocketbar = require('./rocketbar');
var Search = require('../../../../../apps/search/test/marionette/lib/search');
var System = require('./system');

function Bookmark(client) {
  this.client = client;
  this.rocketbar = new Rocketbar(client);
  this.search = new Search(client);
  this.system = new System(client);
}

Bookmark.prototype = {

  Selectors: {
    'bookmarkAddButton': '#done-button',
    'mozbrowser': '.inline-activity.active iframe[mozbrowser]',
  },

  get addButton() {
    return this.client.findElement(
      this.Selectors.bookmarkAddButton);
  },

  get currentTabFrame() {
    return this.client.helper.waitForElement(
      this.Selectors.mozbrowser);
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
    this.search.removeGeolocationPermission();

    this.rocketbar.homescreenFocus();
    this.rocketbar.enterText(url + '\uE006');

    this.system.appChromeContextLink.click();
    this.system.appChromeContextMenuBookmark.click();

    this.add();
  }
};

module.exports = Bookmark;
