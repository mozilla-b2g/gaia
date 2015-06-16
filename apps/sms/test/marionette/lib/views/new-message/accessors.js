'use strict';

/* global module */

var SELECTORS = Object.freeze({
  main: '.panel-ConversationView',
  toField: '#messages-to-field',
  // last-child is a temporary workaound for bug 1097575
  recipientsInput: '#messages-to-field [contenteditable=true]:last-child',
  recipientsList: '#messages-recipients-list',
  recipients: '#messages-recipients-list .recipient[contenteditable=false]',
  pickContactButton: '#messages-contact-pick-button',
  messageInput: '#messages-input',
  subjectInput: '.subject-composer-input',
  sendButton: '#messages-send-button',
  attachButton: '#messages-attach-button',
  header: '#messages-header',
  charCounter: '.message-counter',
  moreHeaderButton: '#messages-options-button',
  mmsLabel: '.mms-label',
  attachment: '#messages-input .attachment-container',
  messageConvertNotice: '#messages-convert-notice'
});

function NewMessageAccessor(client) {
  this.client = client;
}

NewMessageAccessor.prototype = {
  get toField() {
    return this.client.helper.waitForElement(SELECTORS.toField);
  },

  get recipientsInput() {
    return this.client.helper.waitForElement(SELECTORS.recipientsInput);
  },

  get recipientsList() {
    return this.client.helper.waitForElement(SELECTORS.recipientsList);
  },

  get recipients() {
    return this.client.findElements(SELECTORS.recipients);
  },

  get pickContactButton() {
    return this.client.helper.waitForElement(SELECTORS.pickContactButton);
  },

  get messageInput() {
    return this.client.helper.waitForElement(SELECTORS.messageInput);
  },

  get subjectInput() {
    return this.client.helper.waitForElement(SELECTORS.subjectInput);
  },

  get sendButton() {
    return this.client.helper.waitForElement(SELECTORS.sendButton);
  },

  get attachButton() {
    return this.client.helper.waitForElement(SELECTORS.attachButton);
  },

  get header() {
    return this.client.helper.waitForElement(SELECTORS.header);
  },

  get charCounter() {
    return this.client.findElement(SELECTORS.charCounter);
  },

  get mmsLabel() {
    return this.client.findElement(SELECTORS.mmsLabel);
  },

  get attachment() {
    return this.client.findElement(SELECTORS.attachment);
  },

  get conversionBanner() {
    return this.client.findElement(SELECTORS.messageConvertNotice);
  },

  waitToAppear: function() {
    return this.client.helper.waitForElement(SELECTORS.main);
  },

  // TODO: bug 1171989
  showOptions: function() {
    this.client.helper.waitForElement(SELECTORS.moreHeaderButton).tap();
  }
};

module.exports = NewMessageAccessor;
