'use strict';

/* global module */

var ConversationAccessor = require('./accessors');
var MessageAccessor = require('./message_accessors');

var appRoot = require('app-root-path');
// TODO Change the path once requireFromApp becomes its own module
var fromApp = require(appRoot + '/shared/test/integration/require_from_app');

function ConversationView(client) {
  this.client = client;
  this.accessors = new ConversationAccessor(client);
  this.messageAccessors = new MessageAccessor(client);
}

ConversationView.prototype = {
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
    return this._switchToContactsPageObject();
  },

  openAddToExistingContact: function() {
    this.accessors.headerTitle.tap();
    this.accessors.addToExistingContactOption.tap();
    return this._switchToContactsPageObject();
  },

  _switchToContactsPageObject: function() {
    var Contacts = fromApp('contacts').require('lib/contacts');
    var contacts = new Contacts(this.client);
    contacts.switchTo();
    return contacts;
  }
};



module.exports = ConversationView;
