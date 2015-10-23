'use strict';

/* global module */

var ConversationAccessor = require('./accessors');
var MessageAccessor = require('./message_accessors');
var ComposerAccessor = require('../shared/composer_accessors');
var MenuAccessor = require('../shared/menu_accessors');

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

  get messages() {
    return this.accessors.messages.map(function(message) {
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
    var participantsView = new ParticipantsView(this.client);
    participantsView.accessors.waitToAppear();
    return participantsView;
  },

  openReport: function(messageId) {
    var message = this.accessors.findMessage(messageId);

    // Show context menu on message bubble.
    this.client.loader.getActions().longPress(message, 1 /* sec */).perform();
    this.menuAccessors.selectAppMenuOption('View message report');

    var ReportView = require('../report/view');
    var reportView = new ReportView(this.client);
    reportView.accessors.waitToAppear();
    return reportView;
  },

  deleteMessage: function(messageId) {
    var lastMessageWillBeDeleted = this.messages.length === 1;

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

  isSubjectVisible: function() {
    var subjectInput = this.composerAccessors.subjectInput;
    return subjectInput && this.composerAccessors.subjectInput.displayed();
  },

  isMessageInputFocused: function() {
    return this.composerAccessors.messageInput.scriptWith(function(el) {
      return document.activeElement === el;
    });
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
