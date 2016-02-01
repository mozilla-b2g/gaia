/* global require, marionette, setup, suite, test, __dirname */
'use strict';

var assert = require('chai').assert;
var ThreadGenerator = require('./generators/thread');
var Messages = require('./lib/messages.js');
var InboxView = require('./lib/views/inbox/view');
var Storage = require('./lib/storage.js');

marionette('Inbox View tests', function() {
  var client = marionette.client({
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });

  var messagesApp, storage;

  setup(function() {
    messagesApp = Messages.create(client);
    storage = Storage.create(client);

    client.loader.getMockManager('sms').inject([
      'test_storages',
      'test_blobs',
      'navigator_moz_icc_manager',
      'navigator_moz_mobile_message',
      'navigator_moz_contacts'
    ]);
  });

  suite('Long list of conversations', function() {
    setup(function() {
      var phoneNumbers = [];

      for (var i = 0; i < 450; i++) {
        phoneNumbers.push('+1234' + i);
      }

      // Only few first conversations will have photos.
      var contacts = phoneNumbers.slice(0, 10).map(function(phoneNumber) {
        return {
          name: ['Contact ' + phoneNumber],
          tel: [{ value: phoneNumber, type: 'Mobile' }],
          photo: [{ width: 50, height: 50, type: 'image/jpg' }]
        };
      });

      var conversations = phoneNumbers.map(function(phoneNumber) {
        return ThreadGenerator.generate({ participants: [phoneNumber] });
      });

      storage.setContactsStorage(contacts);
      storage.setMessagesStorage(
        conversations, ThreadGenerator.uniqueMessageId
      );

      messagesApp.launch(true /* doNotWaitForAppToBecomeReady */);
    });

    test('User could navigate without waiting for the app to be fully loaded',
    function() {
      var inboxView = new InboxView(client);

      // Make sure we've entered new message view.
      var newMessageView = inboxView.createNewMessage();
      newMessageView.assertRecipientsInputFocused();

      // We should enter new message view even if not all messages are rendered.
      assert.isFalse(inboxView.hasConversation(400));

      // And rendering should still continue.
      client.waitFor(function() {
        return inboxView.hasConversation(400);
      });
    });
  });

  suite('Split Inbox view tests', function() {
    const NUMBER_OF_CONVERSATIONS = 10;
    const NUMBER_OF_MESSAGES_IN_CONVERSATION = 5;

    setup(function() {
      client.contentScript.inject(__dirname + '/mocks/mock_split_view_mode.js');

      ThreadGenerator.uniqueThreadId = 0;

      var conversations = [];
      for (var i = 0; i < NUMBER_OF_CONVERSATIONS; i++) {
        conversations.push(
          ThreadGenerator.generate({
            participants: ['+1234' + i],
            numberOfMessages: NUMBER_OF_MESSAGES_IN_CONVERSATION
          })
        );
      }

      storage.setMessagesStorage(
        conversations, ThreadGenerator.uniqueMessageId
      );

      messagesApp.launch();
    });

    test('All conversations are loaded', function() {
      var inboxView = new InboxView(client);

      client.waitFor(function() {
        return inboxView.conversations.length === NUMBER_OF_CONVERSATIONS;
      });
    });

    test('User can enter New Message view from Inbox and go back', function() {
      var inboxView = new InboxView(client);

      // Make sure we've entered new message view.
      var newMessageView = inboxView.createNewMessage();
      newMessageView.assertRecipientsInputFocused();

      newMessageView.backToInbox();

      client.waitFor(function() {
        return inboxView.conversations.length === NUMBER_OF_CONVERSATIONS;
      });
    });

    test('User can enter Conversation view from Inbox and go back', function() {
      var inboxView = new InboxView(client);

      // Make sure we've entered conversation view.
      var conversationView = inboxView.goToConversation(1);
      assert.equal(
        conversationView.messages().length, NUMBER_OF_MESSAGES_IN_CONVERSATION
      );

      conversationView.backToInbox();

      client.waitFor(function() {
        return inboxView.conversations.length === NUMBER_OF_CONVERSATIONS;
      });
    });
  });
});
