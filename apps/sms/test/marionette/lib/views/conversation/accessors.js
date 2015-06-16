'use strict';

/* global module */

var SELECTORS = Object.freeze({
  main: '.panel-thread',
  message: '.message .bubble',
  headerTitle: '#messages-header-text',
  container: '#messages-container',
  callButton: '#messages-call-number-button',
  // TODO: Remove the next selector once Message has its own accessors
  messageContent: '.message-content > p:first-child',
  createNewContactMenuOption: '.contact-prompt ' +
    '[data-l10n-id="createNewContact"]',
  addToExistingContactOption: '.contact-prompt ' +
    '[data-l10n-id="addToExistingContact"]',
  carrierHeaderPhoneNumber: '#contact-carrier .phone-number'
});

function ConversationAccessor(client) {
  this.client = client;
  this.actions = client.loader.getActions();
}

ConversationAccessor.prototype = {
  get message() {
    return this.client.helper.waitForElement(SELECTORS.message);
  },

  get headerTitle() {
    return this.client.helper.waitForElement(SELECTORS.headerTitle);
  },

  get carrierHeaderPhoneNumber() {
    return this.client.helper.waitForElement(
      SELECTORS.carrierHeaderPhoneNumber
    );
  },

  get callButton() {
    return this.client.helper.waitForElement(SELECTORS.callButton);
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
    return this.client.findElement('.message[data-message-id="' + id + '"]');
  },

  scrollUp: function() {
    var conversationContainer = this.client.findElement(
      SELECTORS.container
    );

    this.actions.flick(conversationContainer, 50, 50, 50, 350).perform();
  },

  waitToAppear: function() {
    var conversationPanel = this.client.helper.waitForElement(SELECTORS.main);
    this.client.waitFor(function() {
      return conversationPanel.location().x === 0;
    });
    return conversationPanel;
  }
};

module.exports = ConversationAccessor;
