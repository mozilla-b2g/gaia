'use strict';
/* global module */

function Bookmark(client) {
  this.client = client;
}

Bookmark.prototype = {

  Selectors: {
    'bookmarkAddButton': '#add-button',
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
};

module.exports = Bookmark;
