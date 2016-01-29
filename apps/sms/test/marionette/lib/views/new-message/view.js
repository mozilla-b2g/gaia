'use strict';

/* global module */

var NewMessageAccessor = require('./accessors');
var ComposerAccessor = require('../shared/composer_accessors');
var MenuAccessor = require('../shared/menu_accessors');
var Tools = require('../shared/tools');

var appRoot = require('app-root-path');
// TODO Change the path once requireFromApp becomes its own module
var fromApp = require(appRoot +
  '/shared/test/integration/require_from_app');

function NewMessageView(client) {
  this.client = client;

  this.accessors = new NewMessageAccessor(client);
  this.composerAccessors = new ComposerAccessor(client);
  this.menuAccessors = new MenuAccessor(client);
}

NewMessageView.prototype = {
  // TODO Move these constants to marionette, see bug 1207516
  KEYS: {
    backspace: '\ue003',
    enter: '\ue007'
  },

  get headerAction() {
    return this.accessors.header.getAttribute('action');
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

  get attachments() {
    return this.composerAccessors.attachments;
  },

  get messageText() {
    return this.composerAccessors.messageInput.text().trim();
  },

  get subject() {
    return this.composerAccessors.subjectInput.text().trim();
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
    this.accessors.recipientsInput.tap(); // tapping the available space
    while (recipientsList.text() !== '') {
      // note: this works because in the app we handle the keys at the list
      // level, but we should rather send the keys to the focussed element.
      recipientsList.sendKeys(this.KEYS.backspace);
    }
  },

  clearMessage: function() {
    var messageInput = this.composerAccessors.messageInput;
    messageInput.tap();
    while (messageInput.text() !== '') {
      messageInput.sendKeys(this.KEYS.backspace);
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
    contacts.switchToApp();
    return contacts;
  },

  typeMessage: function(message) {
    this.composerAccessors.messageInput.sendKeys(message);
  },

  addAttachment: function() {
    return this.composerAccessors.addAttachment();
  },

  /**
   * Take a screenshot of an attachment thumbnail in the composer.
   * @param {Number} the attachment index
   * @return {String} The screenshot
   */
  takeComposerAttachmentScreenshot: function(index) {
    return this.composerAccessors.takeAttachmentScreenshot(index);
  },

  typeSubject: function(subject) {
    this.composerAccessors.subjectInput.sendKeys(subject);
  },

  showOptions: function() {
    this.accessors.optionsButton.tap();
  },

  showSubject: function() {
    this.showOptions();
    this.menuAccessors.selectAppMenuOption('Add subject');
    this.client.helper.waitForElement(this.composerAccessors.subjectInput);
  },

  hideSubject: function() {
    this.showOptions();
    this.menuAccessors.selectAppMenuOption('Remove subject');
    this.client.helper.waitForElementToDisappear(
      this.composerAccessors.subjectInput
    );
  },

  send: function() {
    this.composerAccessors.send();

    var ConversationView = require('../conversation/view');
    var conversationView = new ConversationView(this.client);
    conversationView.accessors.waitToAppear();

    return conversationView;
  },

  back: function() {
    this.client.switchToShadowRoot(this.accessors.header);
    this.accessors.headerActionButton.tap();
    this.client.switchToShadowRoot();
  },

  backToInbox: function() {
    this.back();

    var InboxView = require('../inbox/view');
    var inboxView = new InboxView(this.client);
    inboxView.accessors.waitToAppear();

    return inboxView;
  },

  isSendButtonEnabled: function() {
    var sendButton = this.composerAccessors.sendButton;
    return sendButton.getAttribute('disabled') !== 'true';
  },

  isSubjectVisible: function() {
    var subjectInput = this.composerAccessors.subjectInput;
    return subjectInput && this.composerAccessors.subjectInput.displayed();
  },

  assertMessageInputFocused: function(message) {
    Tools.assertElementFocused(this.composerAccessors.messageInput, message);
  },

  assertRecipientsInputFocused: function(message) {
    Tools.assertElementFocused(this.accessors.recipientsInput, message);
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
