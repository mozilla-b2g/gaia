'use strict';

/* global module */
var BookmarkRemover = function br_ctor(client) {
  this.client = client;
  this.selectors = {
    mozbrowser: '.inline-activity.active iframe[mozbrowser]',
    bookmarkRemoveButton: '#remove-action'
  };
};

BookmarkRemover.prototype = {
  get bookmarkRemoveButton() {
    return this.client.findElement(this.selectors.bookmarkRemoveButton);
  },

  get currentTabFrame() {
    return this.client.findElement(this.selectors.mozbrowser);
  },

  backToApp: function() {
    this.client.switchToFrame();
    this.client.switchToFrame(this.currentTabFrame);
  },

  waitForDisappearance: function() {
    this.client.switchToFrame();
    this.client.helper.waitForElementToDisappear(this.currentTabFrame);
  }
};

module.exports = BookmarkRemover;
