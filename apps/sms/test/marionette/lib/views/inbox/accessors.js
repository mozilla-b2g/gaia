'use strict';

/* global module */

var SELECTORS = Object.freeze({
  main: '.panel-InboxView',
  conversation: '.threadlist-item',
  smsConversation: '.threadlist-item[data-last-message-type="sms"]',
  mmsConversation: '.threadlist-item[data-last-message-type="mms"]',
  conversationTitle: '.threadlist-item-title',
  navigateToComposerHeaderButton: '#threads-composer-link'
});

function InboxAccessor(client) {
  this.client = client;
}

InboxAccessor.prototype = {
  get firstConversation() {
    return this.client.helper.waitForElement(SELECTORS.conversation);
  },

  get smsConversation() {
    return this.client.helper.waitForElement(SELECTORS.smsConversation);
  },

  get mmsConversation() {
    return this.client.helper.waitForElement(SELECTORS.mmsConversation);
  },

  get conversations() {
    return this.client.findElements(SELECTORS.conversation);
  },

  get createNewMessageButton() {
    return this.client.helper.waitForElement(
      SELECTORS.navigateToComposerHeaderButton
    );
  },

  getConversationTitle: function(conversation) {
    return conversation.findElement(SELECTORS.conversationTitle);
  },

  waitToAppear: function() {
    return this.client.helper.waitForElement(SELECTORS.main);
  },

  // Temporary solution to keep the current tests running.
  // TODO: bug 1167103
  navigateToComposer: function() {
    this.createNewMessageButton.tap();
  }
};

module.exports = InboxAccessor;
