'use strict';

/* global module */

var ConversationAccessor = require('./accessors');
var MessageAccessor = require('./message_accessors');
var ComposerAccessor = require('../shared/composer_accessors');
var MenuAccessor = require('../shared/menu_accessors');
var Tools = require('../shared/tools.js');

var appRoot = require('app-root-path');
// TODO Change the path once requireFromApp becomes its own module
var fromApp = require(appRoot + '/shared/test/integration/require_from_app');
var Contacts = fromApp('contacts').require('lib/contacts');

function ConversationView(client) {
  this.client = client;
  this.accessors = new ConversationAccessor(client);
  this.messageAccessors = new MessageAccessor(client);
  this.composerAccessors = new ComposerAccessor(client);
  this.menuAccessors = new MenuAccessor(client);
}

ConversationView.prototype = {
  // TODO Move these constants to marionette, see bug 1207516
  KEYS: {
    backspace: '\ue003'
  },

  get headerTitle() {
    return this.accessors.headerTitle.text();
  },

  get editHeaderTitle() {
    return this.accessors.editHeaderTitle.text();
  },

  get headerAction() {
    return this.accessors.header.getAttribute('action');
  },

  get toggleSelectionButtonTitle() {
    return this.accessors.toggleSelectionButton.text();
  },

  /**
   * Returns the messages in this conversation, following an optional filter.
   * @param {Object} [filter] Optional filter
   * @param {Number} [filter.first] Will return the first n messages.
   * @returns {ParsedMessage[]} List of the messages found.
   */
  messages: function(filter) {
    filter = filter || [];
    var messages = this.accessors.messages;

    if (filter.first) {
      messages = messages.slice(0, filter.first);
    }

    return messages.map(function(message) {
      return this.messageAccessors.parse(message);
    }, this);
  },

  get carrierHeaderPhoneNumber() {
    return this.accessors.carrierHeaderPhoneNumber.text();
  },

  findMessage: function(messageId) {
    var messageNode = this.messageAccessors.find(messageId);
    return messageNode && this.messageAccessors.parse(messageNode);
  },

  waitForFullRendering: function(thread) {
    var lastId = thread.messages[thread.messages.length - 1].id;
    this.accessors.findMessage(lastId);
  },

  downloadMessage: function(messageId) {
    this.messageAccessors.download(messageId);
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

  back: function() {
    this.client.switchToShadowRoot(this.accessors.header);
    this.accessors.headerActionButton.tap();
    this.client.switchToShadowRoot();
  },

  callContact: function() {
    this.accessors.callButton.tap();

    var Dialer = fromApp('dialer').require('lib/dialer');
    var dialer = new Dialer(this.client);
    dialer.switchTo();
    return dialer;
  },

  openCreateNewContact: function() {
    this.accessors.headerTitle.tap();
    this.accessors.createNewContactOption.tap();
    var contacts = new Contacts(this.client);
    contacts.switchToCreateNewContactActivity();
    return contacts;
  },

  openAddToExistingContact: function() {
    this.accessors.headerTitle.tap();
    this.accessors.addToExistingContactOption.tap();
    return this._switchToContactsApp();
  },

  openParticipants: function() {
    this.accessors.headerTitle.tap();

    var ParticipantsView = require('../participants/view');
    var participantsView = new ParticipantsView(this.client, this);
    participantsView.accessors.waitToAppear();
    return participantsView;
  },

  openReport: function(messageId) {
    var message = this.accessors.findMessage(messageId);

    // Show context menu on message bubble.
    this.client.loader.getActions().longPress(message, 1 /* sec */).perform();
    this.menuAccessors.selectAppMenuOption('View message report');

    var ReportView = require('../report/view');
    var reportView = new ReportView(this.client, this);
    reportView.accessors.waitToAppear();
    return reportView;
  },

  deleteMessage: function(messageId) {
    var lastMessageWillBeDeleted = this.messages().length === 1;

    var message = this.accessors.findMessage(messageId);

    // Show context menu on message bubble.
    this.client.loader.getActions().longPress(message, 1 /* sec */).perform();
    this.menuAccessors.selectAppMenuOption('Delete');

    var dialogView = new (require('../dialog/view'))(this.client);
    dialogView.chooseAction('Delete');

    // If deleted message was the last one, user will be returned back to Inbox.
    var currentView;
    if (lastMessageWillBeDeleted) {
      currentView = new (require('../inbox/view'))(this.client);
      currentView.accessors.waitToAppear();
    } else {
      currentView = this;
    }

    return currentView;
  },

  clearMessage: function() {
    var messageInput = this.composerAccessors.messageInput;
    messageInput.tap();
    while (messageInput.text() !== '') {
      messageInput.sendKeys(this.KEYS.backspace);
    }
  },

  typeMessage: function(message) {
    this.composerAccessors.messageInput.sendKeys(message);
  },

  addAttachment: function() {
    return this.composerAccessors.addAttachment();
  },

  /**
   * Take a screenshot of an attachment thumbnail in the composer.
   * @param {Number} The attachment index
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

  /**
   * Launch the "include someone else" action.
   * @returns {NewMessageView} the new message view we navigated to.
   */
  includeSomeoneElse: function() {
    this.showOptions();
    this.menuAccessors.selectAppMenuOption('Include someone else');

    var NewMessageView = require('../new-message/view');
    var newMessageView = new NewMessageView(this.client);
    newMessageView.accessors.waitToAppear();
    return newMessageView;
  },

  hideSubject: function() {
    this.showOptions();
    this.menuAccessors.selectAppMenuOption('Remove subject');
    this.client.helper.waitForElementToDisappear(
      this.composerAccessors.subjectInput
    );
  },

  enterEditMode: function() {
    this.showOptions();
    this.menuAccessors.selectAppMenuOption('Select Messages');
  },

  exitEditMode: function() {
    this.back();
  },

  tapOnMessage: function(messageId) {
    var messageNode = this.messageAccessors.find(messageId);
    messageNode.scriptWith(function(node) {
      node.scrollIntoView();
    });
    messageNode.tap();
  },

  toggleMessagesSelection: function() {
    var header = this.accessors.header;
    // This is a workaround needed as the screen is moving app is
    // moving outside the screen on running tapOnMessage().
    // This is needed to get the header back in the frame
    header.scriptWith(function(node) {
      node.scrollIntoView();
    });
    this.accessors.toggleSelectionButton.tap();
  },

  isSubjectVisible: function() {
    var subjectInput = this.composerAccessors.subjectInput;
    return subjectInput && this.composerAccessors.subjectInput.displayed();
  },

  fakeScrollUpTo: function(scrollTop) {
    this.accessors.fakeScrollUpTo(scrollTop);
  },

  assertMessageInputFocused: function(message) {
    Tools.assertElementFocused(this.composerAccessors.messageInput, message);
  },

  backToInbox: function() {
    this.back();

    var InboxView = require('../inbox/view');
    var inboxView = new InboxView(this.client);
    inboxView.accessors.waitToAppear();

    return inboxView;
  },

  _switchToContactsApp: function() {
    var contacts = new Contacts(this.client);
    contacts.switchToApp();
    return contacts;
  }
};



module.exports = ConversationView;
