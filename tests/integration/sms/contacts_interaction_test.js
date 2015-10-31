/* global require, marionette, setup, suite, test */
'use strict';

var assert = require('chai').assert;

var appRoot = require('app-root-path');
// TODO Change the path once requireFromApp becomes its own module
var fromApp = require(appRoot + '/shared/test/integration/require_from_app');

var Messages = fromApp('sms').require('lib/messages');
var InboxView = fromApp('sms').require('lib/views/inbox/view');
var ThreadGenerator = fromApp('sms').require('generators/thread');
var Storage = fromApp('sms').require('lib/storage.js');

var Contacts = fromApp('contacts').require('lib/contacts');
var ContactsData = fromApp('contacts').require('lib/contacts_data');

marionette('Contacts', function() {
  var messagesApp;

  var client = marionette.client({
    prefs: {
      'focusmanager.testmode': true
    }
  });

  var thread, storage, contactsData, inbox;

  var testContact = {
    givenName: ['FirstName'],
    familyName: ['LastName'],
    name: ['FirstName LastName'],
    tel: [{
      value: '5551234567',
      type: ['home']
    }],
  };

  setup(function() {
    var contactsApp = new Contacts(client);
    contactsApp.launch();
    contactsData = new ContactsData(client);
    contactsData.createMozContact(testContact);
    // Change once bug 1140344 lands. Closing the application is needed,
    // in order to be sure to switch to the right frame when an activity is
    // started.
    contactsApp.close();

    messagesApp = Messages.create(client);
    storage = Storage.create(client);

    client.contentScript.inject(
      fromApp('sms').filePath('mocks/mock_test_storages.js')
    );
    client.contentScript.inject(
      fromApp('sms').filePath('mocks/mock_navigator_moz_mobile_message.js')
    );

    messagesApp.launch();
    inbox = new InboxView(client);
  });

  suite('Conversation Header', function() {
    var conversation;

    setup(function() {
      thread = ThreadGenerator.generate();
      storage.setMessagesStorage([thread], ThreadGenerator.uniqueMessageId);
      conversation = inbox.goToFirstThread();
    });

    // Deactivated because of bug 1175080. Sometimes Marionette looses the
    // connection, which is making some intermittent Gij runs.
    test.skip('should create a new contact', function() {
      // Bug 1175080. Asserting on the throw makes the error message clearer.
      // Otherwise we just have a crash in the stackwalk.
      assert.doesNotThrow(function() {
        var newContact = conversation.openCreateNewContact();

        newContact.enterContactDetails({
          givenName: 'Given',
          familyName: 'Family',
        });

        messagesApp.switchTo();

        assert.equal(conversation.carrierHeaderPhoneNumber, '+123');
        assert.equal(conversation.headerTitle, 'Given Family');
      });
    });

    // Deactivated because of bug 1175080. Sometimes Marionette looses the
    // connection, which is making some intermittent Gij runs.
    test.skip('should add the phone number to an existing contact', function() {
      // Bug 1175080. Asserting on the throw makes the error message clearer.
      // Otherwise we just have a crash in the stackwalk.
      assert.doesNotThrow(function() {
        var contactPicker = conversation.openAddToExistingContact();
        contactPicker.tapContact(testContact.name);
        contactPicker.tapUpdate();
        messagesApp.switchTo();

        assert.equal(conversation.carrierHeaderPhoneNumber, '+123');
        assert.equal(conversation.headerTitle, testContact.name);
      });
    });
  });

  suite('add recipient', function() {
    var newMessage;

    setup(function() {
      storage.setMessagesStorage();
      newMessage = inbox.createNewMessage();
    });

    // XXX Deactivated because sms app should invoke the new pick activity
    // instead of invoking the old contacts list
    test.skip('should pick contacts from Contacts', function() {
      var contactPicker = newMessage.openContactPicker();
      contactPicker.tapContact(testContact.name);
      messagesApp.switchTo();

      var recipients = newMessage.recipients;
      assert.lengthOf(recipients, 1);
      assert.deepEqual(recipients, testContact.name);
    });
  });
});
