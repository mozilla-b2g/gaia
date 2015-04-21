'use strict';

/* global module */

var SELECTORS = Object.freeze({
  main: '#thread-list',
  firstConversation: '.threadlist-item',
  smsConversation: '.threadlist-item[data-last-message-type="sms"]',
  mmsConversation: '.threadlist-item[data-last-message-type="mms"]',
  navigateToComposerHeaderButton: '#threads-composer-link'
});

function InboxAccessor(client) {
  this.client = client;
}

InboxAccessor.prototype = {
  get firstConversation() {
    return this.client.helper.waitForElement(SELECTORS.firstConversation);
  },

  get smsConversation() {
    return this.client.helper.waitForElement(SELECTORS.smsConversation);
  },

  get mmsConversation() {
    return this.client.helper.waitForElement(SELECTORS.mmsConversation);
  },

  waitToAppear: function() {
    return this.client.helper.waitForElement(SELECTORS.main);
  },

  // Temporary solution to keep the current tests running.
  // TODO: bug 1167103
  navigateToComposer: function() {
    this.client.helper.waitForElement(SELECTORS.navigateToComposerHeaderButton)
      .tap();
  }
};

module.exports = InboxAccessor;
