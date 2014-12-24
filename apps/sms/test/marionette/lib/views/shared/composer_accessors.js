'use strict';

/* global module */

var SELECTORS = Object.freeze({
  messageInput: '#messages-input',
  subjectInput: '.subject-composer-input',
  sendButton: '#messages-send-button',
  attachButton: '#messages-attach-button',
  charCounter: '.message-counter',
  mmsLabel: '.mms-label',
  attachment: '#messages-input .attachment-container'
});

function ComposerAccessor(client) {
  this.client = client;
}

ComposerAccessor.prototype = {
  get messageInput() {
    return this.client.helper.waitForElement(SELECTORS.messageInput);
  },

  get subjectInput() {
    return this.client.findElement(SELECTORS.subjectInput);
  },

  get sendButton() {
    return this.client.helper.waitForElement(SELECTORS.sendButton);
  },

  get attachButton() {
    return this.client.helper.waitForElement(SELECTORS.attachButton);
  },

  get charCounter() {
    return this.client.findElement(SELECTORS.charCounter);
  },

  get mmsLabel() {
    return this.client.findElement(SELECTORS.mmsLabel);
  },

  get attachments() {
    return this.client.findElements(SELECTORS.attachment);
  },

  addAttachment: function() {
    this.client.waitFor(function() {
      return this.attachButton.enabled();
    }.bind(this));

    this.attachButton.tap();

    var ActivityChooserView = require('../activity-chooser/view');
    return new ActivityChooserView(this.client);
  },

  takeAttachmentScreenshot(index) {
    return this.client.screenshot({ element: this.attachments[index] });
  },

  send: function() {
    this.client.waitFor(function() {
      return this.sendButton.enabled();
    }.bind(this));

    this.sendButton.tap();
  }
};

module.exports = ComposerAccessor;
