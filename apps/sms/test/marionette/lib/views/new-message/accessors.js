'use strict';

/* global module */

var SELECTORS = Object.freeze({
  main: '.panel-ConversationView',
  toField: '#messages-to-field',
  // last-child is a temporary workaround for bug 1097575
  recipientsInput: '#messages-to-field [contenteditable=true]:last-child',
  recipientsList: '#messages-recipients-list',
  recipients: '#messages-recipients-list .recipient[contenteditable=false]',
  pickContactButton: '#messages-contact-pick-button',
  header: '#messages-header',
  headerActionButton: '.action-button',
  optionsButton: '#messages-options-button',
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

  get optionsButton() {
    return this.client.helper.waitForElement(SELECTORS.optionsButton);
  },

  get header() {
    return this.client.helper.waitForElement(SELECTORS.header);
  },

  get headerActionButton() {
    return this.client.helper.waitForElement(SELECTORS.headerActionButton);
  },

  get conversionBanner() {
    return this.client.findElement(SELECTORS.messageConvertNotice);
  },

  waitToAppear: function() {
    return this.client.helper.waitForElement(SELECTORS.main);
  }
};

module.exports = NewMessageAccessor;
