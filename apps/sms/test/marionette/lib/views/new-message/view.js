'use strict';

/* global module */

var NewMessageAccessor = require('./accessors');

var appRoot = require('app-root-path');
// TODO Change the path once requireFromApp becomes its own module
var fromApp = require(appRoot +
  '/shared/test/integration/require_from_app');

function NewMessageView(client) {
  this.client = client;
  this.accessors = new NewMessageAccessor(client);
}

NewMessageView.prototype = {
  // TODO Move these constants to marionette
  KEYS: {
    backspace: '\ue003',
    enter: '\ue007'
  },

  get recipients() {
    return this.accessors.recipients.map(function(recipient) {
      return recipient.text();
    });
  },

  get recipientsPhoneNumbers() {
    return this.accessors.recipients.map(function(recipient) {
      return recipient.getAttribute('data-number');
    });
  },

  addNewRecipient: function(recipient, separator) {
    separator = separator === undefined ? this.KEYS.enter : separator;

    this.accessors.recipientsInput.sendKeys(recipient + separator);

    // Since recipient.js re-renders recipients all the time (when new
    // recipient is added or old is removed) and it can happen several
    // times during single "add" or "remove" operation we should
    // wait until Recipients View is in a final state. The problem here is
    // that between "findElement" and "displayed" calls element can
    // actually be removed from DOM and re-created again that will lead to
    // "stale element" exception.
    var toField = this.accessors.toField;
    toField.scriptWith(observeElementStability);
    this.client.helper.waitFor(function() {
      return toField.scriptWith(function(el) {
        return !!el.dataset.__stable;
      });
    });
  },

  clearRecipients: function() {
    var recipientsList = this.accessors.recipientsList;
    recipientsList.tap();
    while (recipientsList.text() !== '') {
      recipientsList.sendKeys(this.KEYS.backspace);
    }
  },

  containsInvalidRecipients: function() {
    return this.accessors.recipients.some(function(recipient) {
      return recipient.getAttribute('class').indexOf('invalid') > -1;
    });
  },

  openContactPicker: function() {
    this.accessors.pickContactButton.tap();
    var Contacts = fromApp('contacts').require('lib/contacts');
    var contacts = new Contacts(this.client);
    contacts.switchTo();
    return contacts;
  },

  typeMessage: function(message) {
    this.accessors.messageInput.sendKeys(message);
  },

  isSendButtonEnabled: function() {
    return this.accessors.sendButton.getAttribute('disabled') !== 'true';
  }
};

function observeElementStability(el) {
  delete el.dataset.__stable;

  function markElementAsStable() {
    return setTimeout(function() {
      el.dataset.__stable = 'true';
      observer.disconnect();
    }, 1000);
  }

  var timeout = markElementAsStable();
  var observer = new MutationObserver(function() {
    if (timeout) {
      clearTimeout(timeout);
      timeout = markElementAsStable();
    }
  });
  observer.observe(el, { childList: true, subtree: true });
}

module.exports = NewMessageView;
