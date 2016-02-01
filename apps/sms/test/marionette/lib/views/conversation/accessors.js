'use strict';

/* global module */

var SELECTORS = Object.freeze({
  main: '.panel-ConversationView',
  message: '.message',
  messageBubble: '.message .bubble',
  header: '#messages-header',
  headerTitle: '#messages-header-text',
  headerActionButton: '.action-button',
  container: '#messages-container',
  callButton: '#messages-call-number-button',
  // TODO: Remove the next selector once Message has its own accessors
  messageContent: '.message-content > p:first-child',
  createNewContactMenuOption: '.contact-prompt ' +
    '[data-l10n-id="createNewContact"]',
  addToExistingContactOption: '.contact-prompt ' +
    '[data-l10n-id="addToExistingContact"]',
  carrierHeaderPhoneNumber: '#contact-carrier .phone-number',
  optionsButton: '#messages-options-button'
});

var EDIT_MODE_SELECTORS = Object.freeze({
  toggleSelectionButton: '#messages-check-uncheck-all-button',
  editHeaderTitle: '#messages-edit-mode'
});

function ConversationAccessor(client) {
  this.client = client;
  this.actions = client.loader.getActions();
}

ConversationAccessor.prototype = {
  get messages() {
    return this.client.findElements(SELECTORS.message);
  },

  get message() {
    return this.client.helper.waitForElement(SELECTORS.messageBubble);
  },

  get header() {
    return this.client.helper.waitForElement(SELECTORS.header);
  },

  get headerTitle() {
    return this.client.helper.waitForElement(SELECTORS.headerTitle);
  },

  get editHeaderTitle() {
    return this.client.helper.waitForElement(
      EDIT_MODE_SELECTORS.editHeaderTitle
    );
  },

  get headerActionButton() {
    return this.client.helper.waitForElement(SELECTORS.headerActionButton);
  },

  get carrierHeaderPhoneNumber() {
    return this.client.helper.waitForElement(
      SELECTORS.carrierHeaderPhoneNumber
    );
  },

  get callButton() {
    return this.client.helper.waitForElement(SELECTORS.callButton);
  },

  get optionsButton() {
    return this.client.helper.waitForElement(SELECTORS.optionsButton);
  },

  get toggleSelectionButton() {
    return this.client.helper.waitForElement(
      EDIT_MODE_SELECTORS.toggleSelectionButton
    );
  },

  get createNewContactOption() {
    return this.client.helper.waitForElement(
      SELECTORS.createNewContactMenuOption
    );
  },

  get addToExistingContactOption() {
    return this.client.helper.waitForElement(
      SELECTORS.addToExistingContactOption
    );
  },

  getMessageContent: function(message) {
    return this.client.helper.waitForElement(
      message.findElement(SELECTORS.messageContent)
    );
  },

  findMessage: function(id) {
    return this.client.findElement(
      '.message[data-message-id="' + id + '"] .bubble'
    );
  },

  scrollUp: function() {
    var conversationContainer = this.client.findElement(
      SELECTORS.container
    );

    this.actions.flick(conversationContainer, 50, 50, 50, 350).perform();
  },

  fakeScrollUpTo: function(scrollTop) {
    var conversationContainer = this.client.findElement(
      SELECTORS.container
    );

    conversationContainer.scriptWith(function(container, scrollTop) {
      container.scrollTop = scrollTop;
    }, [scrollTop]);
  },

  waitToAppear: function() {
    var conversationPanel = this.client.helper.waitForElement(SELECTORS.main);

    this.client.waitFor(() => {
      return conversationPanel.rect().x === 0 && this.client.executeScript(
        function() {
          return window.wrappedJSObject.Navigation.isCurrentPanel('thread');
        }
      );
    });

    return conversationPanel;
  }
};

module.exports = ConversationAccessor;
