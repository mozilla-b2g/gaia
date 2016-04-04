'use strict';

/* global module */

var SELECTORS = Object.freeze({
  main: '.message[data-message-id="{id}"]',
  bubble: '.bubble',
  content: '.message-content-body',
  attachment: '.attachment-container',
  downloadButton: 'button.download'
});

function MessageAccessor(client) {
  this.client = client.scope({ searchTimeout: 50 });
  this.actions = client.loader.getActions();
}

MessageAccessor.prototype = {
  find: function(messageId) {
    return this.client.findElement(SELECTORS.main.replace('{id}', messageId));
  },

  parse: function(messageNode) {
    // It's workaround for the case when message node reference is stale,
    // so when we try to access MarionetteElement from the node that's not
    // attached to the dom we'll get an exception.
    try {
      var messageClass = messageNode.getAttribute('class');
      var checkbox = messageNode.findElement('input[type=checkbox]');
      // Since most of the messages don't contain any attachments, let's make
      // it much faster.
      var attachments = this.client.scope({ searchTimeout: 50 }).findElements(
        SELECTORS.attachment, null /* default search method */, messageNode.id
      );

      return {
        id: +messageNode.getAttribute('data-message-id'),
        type: messageClass.indexOf('mms') >= 0 ? 'mms' : 'sms',
        content: messageNode.findElement(SELECTORS.content).text(),
        attachments: attachments.map(function(attachment) {
          return {
            screenshot: function() {
              return this.client.screenshot({ element: attachment });
            }.bind(this),
            type: attachment.getAttribute('data-attachment-type')
          };
        }, this),
        isDownloaded: messageClass.indexOf('not-downloaded') < 0,
        isPending: messageClass.indexOf('pending') >= 0,
        isInEditMode: messageNode.findElement('.pack-checkbox').displayed(),
        isSelected: checkbox.getAttribute('checked') === 'true',
        isDisplayed: messageNode.displayed()
      };
    } catch(e) {
      console.warn('Message node is not available', e, e.stack);

      return null;
    }
  },

  download: function(messageId) {
    var messageNode = this.find(messageId);

    if (this.parse(messageNode).isDownloaded) {
      throw new Error('Message has been already downloaded!');
    }

    messageNode.findElement(SELECTORS.downloadButton).tap();
  }
};

module.exports = MessageAccessor;
