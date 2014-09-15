'use strict';
/* global module */

function Bookmark(client, server) {
  this.client = client;
  this.server = server;
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

  backToApp: function() {
    this.client.switchToFrame();
    this.client.switchToFrame(this.currentTabFrame);
  },

  save: function(url, browser) {
    var helper = this.client.helper;

    // Running tests with B2G desktop on Linux, a 'Download complete'
    // notification-toaster will pop up and make tests failed
    this.client.switchToFrame();

    browser.launch();
    helper.waitForElement('body.loaded');
    this.client.switchToFrame();

    var notifToaster = this.client.findElement('#notification-toaster');
    if (notifToaster.displayed()) {
      // Bug 952377: client.helper.waitForElementToDisappear(notifToaster)
      // will failed and got timeout.
      // (notifToaster.displayed() is always true)
      // So we workaround this to wait for .displayed get removed
      // from notifToaster
      helper.waitFor(function() {
        return notifToaster.getAttribute('class').indexOf('displayed') < 0;
      });
    }

    browser.backToApp();
    browser.searchBar.sendKeys(url);
    browser.searchButton.click();

    // Ensure page is loaded before clicking the bookmark icon
    var webFrame = helper.waitForElement('iframe[src="' + url + '"]');
    this.client.switchToFrame(webFrame);
    helper.waitForElement('header h1');
    browser.backToApp();

    helper.waitForElement(browser.bookmarkButton).click();
    helper.waitForElement(browser.bookmarkAddToHomeButton).click();
    this.backToApp();
    this.addButton.click();
  },
};

module.exports = Bookmark;
