/* global require, marionette, setup, suite, test, __dirname */
'use strict';

var assert = require('chai').assert;
var ThreadGenerator = require('./generators/thread');
var Messages = require('./lib/messages.js');
var Storage = require('./lib/storage.js');

marionette('Conversation Panel Tests', function() {
  var MOCKS = [
    '/mocks/mock_test_storages.js',
    '/mocks/mock_navigator_moz_icc_manager.js',
    '/mocks/mock_navigator_moz_mobile_message.js',
    '/mocks/mock_navigator_moz_contacts.js'
  ];

  var client = marionette.client();

  var messagesApp, storage;

  function assertIsDisplayed(element) {
    assert.isTrue(element.displayed(), 'Element should be displayed');
  }

  function assertIsFocused(element, message) {
    assert.isTrue(element.scriptWith(function(el) {
      return document.activeElement === el;
    }), message);
  }

  setup(function() {
    messagesApp = Messages.create(client);
    storage = Storage.create(client);

    MOCKS.forEach(function(mock) {
      client.contentScript.inject(__dirname + mock);
    });
  });

  suite('General use cases', function() {
    suite('Long SMS thread', function() {
      var thread;
      setup(function() {
        thread = ThreadGenerator.generate({
          numberOfMessages: 50
        });
        messagesApp.launch();

        storage.setMessagesStorage([thread], ThreadGenerator.uniqueMessageId);
        // Set empty contacts store.
        storage.setContactsStorage();
      });

      test('User can see all messages when scrolls up', function() {
        var pageSize = 10;
        var loadedPage = 1;

        messagesApp.Inbox.firstConversation.tap();

        // Composer panel should always be visible
        assertIsDisplayed(messagesApp.Composer.sendButton);
        assertIsDisplayed(messagesApp.Composer.messageInput);

        thread.messages.forEach(function(message, index) {
          var messageNode = messagesApp.Conversation.findMessage(message.id);

          // If current page is loaded, then message node should be visible
          if (index < pageSize * loadedPage) {
            client.helper.waitForElement(messageNode);
          } else {
            // Otherwise, node may not be visible and we should scroll up to
            // see it
            messagesApp.Conversation.scrollUp();
            loadedPage++;

            client.helper.waitForElement(messageNode);
          }
        });

        assertIsDisplayed(messagesApp.Composer.sendButton);
        assertIsDisplayed(messagesApp.Composer.messageInput);
      });
    });
  });

  suite('Forward message', function() {
    setup(function() {
      messagesApp.launch();

      // Set empty messages and contacts store.
      storage.setMessagesStorage();
      storage.setContactsStorage();

      messagesApp.Inbox.navigateToComposer();

      // Create new thread from the scratch
      messagesApp.addRecipient('+1');
      messagesApp.Composer.messageInput.sendKeys('message');
      messagesApp.send();
    });

    test('Header should be updated accordingly', function() {
      client.helper.waitForElement(messagesApp.Conversation.message);

      assert.equal(
        messagesApp.Conversation.headerTitle.text(),
        '+1',
        'Header title should display contact phone number'
      );

      // Forward message
      messagesApp.contextMenu(messagesApp.Conversation.message);
      messagesApp.selectAppMenuOption('Forward');
      // Wait for message to be forwarded to fill out composer fields
      client.waitFor(function() {
        return messagesApp.Composer.messageInput.text() === 'message';
      });

      assert.equal(
        messagesApp.Conversation.headerTitle.text(),
        'New message',
        'Header title should indicate that we are composing new message'
      );

      assertIsFocused(
        messagesApp.Composer.recipientsInput,
        'Recipients input should be focused'
      );
    });
  });

  suite('Action links in messages', function() {
    var threads;
    setup(function() {
      threads = [];
      threads.push(ThreadGenerator.generate({
        participants: ['+100000'],
        body: 'Use these numbers: +200000, +300000 or +400000'
      }));

      threads.push(ThreadGenerator.generate({
        participants: ['+400000'],
        body: 'Call +400000 or send message to mozilla@mozilla.org'
      }));

      messagesApp.launch();

      storage.setMessagesStorage(threads, ThreadGenerator.uniqueMessageId);

      storage.setContactsStorage([{
        name: ['Alan Turing'],
        tel: [{
          value: '+300000',
          type: 'Mobile'
        }]
      }]);
    });

    test('Send message to unknown number', function() {
      messagesApp.Inbox.firstConversation.tap();

      // Try to send message to the unknown number
      var unknownNumberLink = messagesApp.Conversation.message.findElement(
        '[data-dial="+200000"]'
      );
      unknownNumberLink.tap();
      messagesApp.selectContactPromptMenuOption('Send message');

      // Wait for the recipient input to be filled
      var recipients = messagesApp.Composer.recipients;
      client.waitFor(function() {
        return recipients.length === 1;
      });

      assert.equal(recipients[0].text(), '+200000');
      assert.equal(recipients[0].getAttribute('data-source'), 'manual');

      assertIsFocused(
        messagesApp.Composer.messageInput, 'Message input should be focused'
      );
    });

    test('Send message to contact number', function() {
      messagesApp.Inbox.firstConversation.tap();

      // Try to send message to number that has contact associated with it
      var unknownNumberLink = messagesApp.Conversation.message.findElement(
        '[data-dial="+300000"]'
      );
      unknownNumberLink.tap();
      messagesApp.selectContactPromptMenuOption('Send message');

      // Wait for the recipient input to be filled
      var recipients = messagesApp.Composer.recipients;
      client.waitFor(function() {
        return recipients.length === 1;
      });

      assert.equal(recipients[0].text(), 'Alan Turing');
      assert.equal(recipients[0].getAttribute('data-source'), 'contacts');

      assertIsFocused(
        messagesApp.Composer.messageInput, 'Message input should be focused'
      );
    });

    test('Send message to thread number', function() {
      messagesApp.Inbox.firstConversation.tap();

      // Try to send message to number that has thread associated with it
      var threadNumberLink = messagesApp.Conversation.message.findElement(
        '[data-dial="+400000"]'
      );
      threadNumberLink.tap();
      messagesApp.selectContactPromptMenuOption('Send message');

      // Verify that we entered the right thread
      var message = messagesApp.Conversation.message;
      assert.equal(
        messagesApp.Conversation.getMessageContent(message).text(),
        threads[1].messages[0].body
      );

      assertIsFocused(
        messagesApp.Composer.messageInput, 'Message input should be focused'
      );
    });
  });
});
