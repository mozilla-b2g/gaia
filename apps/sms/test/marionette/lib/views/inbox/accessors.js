'use strict';

/* global module */

var SELECTORS = Object.freeze({
  main: '.panel-InboxView',
  conversation: '.threadlist-item',
  smsConversation: '.threadlist-item[data-last-message-type="sms"]',
  mmsConversation: '.threadlist-item[data-last-message-type="mms"]',
  conversationTitle: '.threadlist-item-title',
  navigateToComposerHeaderButton: '#threads-composer-link',
  threadSettings: '#hreads-options-button',
  threadsList: 'data-l10n-id=["selectThreads-label"]',
  firstThread: 'data-mode=["threads"]',
  buttonDeleteThread: '#threads-delete-button'
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

  findConversation: function(id) {
    return this.client.findElement('#thread-' + id);
  },

  hasConversation: function(id) {
    try {
      return !!this.client.scope({ searchTimeout: 100 }).findElement(
        '#thread-' + id
      );
    } catch(e) {
      return false;
    }
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
  },

  doubleTapOnFirstConversation: function() {
    this.client.loader.getActions().doubleTap(this.firstConversation).perform();
  },
  openSettings: function(){
    return this.client.findElement(SELECTORS.threadSettings).tap();
  },
  goToThreads: function(){
    return this.client.findElement(SELECTORS.threadsList).tap();
  },
  gotToFirstThread: function(){
    return this.client.findElement(SELECTORS.firstThread).tap();
  },
  deleteSelectedThread: function(){
    return this.client.findElement(SELECTORS.buttonDeleteThread).tap();
  }
};

module.exports = InboxAccessor;
