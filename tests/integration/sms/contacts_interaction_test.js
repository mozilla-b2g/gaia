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

    // Disabling these tests by now due to we need a way to switch to an
    // activity instead of switching to an app, due to paths can differ.
    // More info in [1].
    // These tests must be recovered once this bug will be landed.

    // [1] https://bugzilla.mozilla.org/show_bug.cgi?id=1140344#c9
    test.skip('should create a new contact', function() {
      var newContact = conversation.openCreateNewContact();

      // Bug 1175080. Sometimes Marionette looses the connection. Asserting on
      // the throw makes the error message clearer. Otherwise we just have a
      // crahs in the stackwalk.
      assert.doesNotThrow(function() { newContact.enterContactDetails({
          givenName: 'Given',
          familyName: 'Family',
        });
      });
      messagesApp.switchTo();

      assert.equal(conversation.carrierHeaderPhoneNumber, '+123');
      assert.equal(conversation.headerTitle, 'Given Family');
    });

    test.skip('should add the phone number to an existing contact', function() {
      var contactPicker = conversation.openAddToExistingContact();
      contactPicker.tapContact(testContact.name);
      contactPicker.tapUpdate();
      messagesApp.switchTo();

      assert.equal(conversation.carrierHeaderPhoneNumber, '+123');
      assert.equal(conversation.headerTitle, testContact.name);
    });
  });

  suite('add recipient', function() {
    var newMessage;

    setup(function() {
      storage.setMessagesStorage();
      newMessage = inbox.createNewMessage();
    });

    test('should pick contacts from Contacts', function() {
      var contactPicker = newMessage.openContactPicker();
      contactPicker.tapContact(testContact.name);
      messagesApp.switchTo();

      var recipients = newMessage.recipients;
      assert.lengthOf(recipients, 1);
      assert.deepEqual(recipients, testContact.name);
    });
  });
});
