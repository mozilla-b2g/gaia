/* global require, marionette, setup, suite, test, __dirname */
'use strict';

var assert = require('chai').assert;
var ThreadGenerator = require('./generators/thread');
var Messages = require('./lib/messages.js');
var InboxView = require('./lib/views/inbox/view');
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
    var smsBody = 'this is a sms body';
    var mmsBody = 'this is a mms body';

    var smsThread, mmsThread;

    setup(function() {
      smsThread = ThreadGenerator.generate({
        body: smsBody
      });

      mmsThread = ThreadGenerator.generate({
        numberOfMessages: 1,
        messageType: 'mms',
        participants: ['a@b.c'],
        attachments: [
          { type: 'image/png', width: 10,  height: 10 },
          { type: 'text/plain', content: mmsBody }
        ]
      });

      messagesApp.launch();
      storage.setMessagesStorage(
        [smsThread, mmsThread],
        ThreadGenerator.uniqueMessageId
      );
      // empty contact store
      storage.setContactsStorage();
    });

    test('Forward a SMS', function() {
      messagesApp.Inbox.findConversation(smsThread.id).tap();

      // Forward message
      messagesApp.contextMenu(messagesApp.Conversation.message);
      messagesApp.selectAppMenuOption('Forward');
      // Wait for message to be forwarded to fill out composer fields
      client.waitFor(function() {
        return messagesApp.Composer.messageInput.text() !== '';
      });

      assert.equal(
        messagesApp.Composer.messageInput.text(),
        smsBody,
        'Forwarded body is the initial body'
      );

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

    test('Forwarding a MMS', function() {
      messagesApp.Inbox.findConversation(mmsThread.id).tap();

      // Forward message
      messagesApp.contextMenu(messagesApp.Conversation.message);
      messagesApp.Menu.selectAppMenuOption('Forward');
      // Wait for message to be forwarded to fill out composer fields
      client.waitFor(function() {
        return messagesApp.Composer.messageInput.text() !== '';
      });

      assert.equal(
        messagesApp.Composer.messageInput.text(),
        mmsBody,
        'Forwarded body is the initial body'
      );

      var composerAttachment =  messagesApp.Composer.attachment;
      assert.isNotNull(composerAttachment);
      assert.equal(
        composerAttachment.getAttribute('data-attachment-type'), 'img'
      );

      assert.equal(
        messagesApp.Conversation.headerTitle.text(),
        'New message',
        'Header title should indicate that we are composing new message'
      );

      assertIsFocused(
        messagesApp.NewMessage.recipientsInput,
        'Recipients input should be focused'
      );
    });
  });

  suite('Action links in messages', function() {
    var threads;
    setup(function() {
      threads = [
        ThreadGenerator.generate({
          participants: ['+400000'],
          body: 'Call +400000 or send message to mozilla@mozilla.org'
        }),
        ThreadGenerator.generate({
          participants: ['+100000'],
          body: 'Use these numbers: +200000, +300000 or +400000'
        })
      ];

      messagesApp.launch();

      storage.setMessagesStorage(threads, ThreadGenerator.uniqueMessageId);

      storage.setContactsStorage([{
        name: ['Alan Turing'],
        tel: [{
          value: '+300000',
          type: 'Mobile'
        }]
      }]);

      messagesApp.Inbox.findConversation(threads[1].id).tap();
    });

    test('Send message to unknown number', function() {
      // Try to send message to the unknown number
      var unknownNumberLink = messagesApp.Conversation.message.findElement(
        '[data-dial="+200000"]'
      );
      unknownNumberLink.tap();
      messagesApp.Menu.selectContactPromptMenuOption('Send message');

      // Wait for the recipient input to be filled
      var recipients = messagesApp.NewMessage.recipients;
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
      // Try to send message to number that has contact associated with it
      var unknownNumberLink = messagesApp.Conversation.message.findElement(
        '[data-dial="+300000"]'
      );
      unknownNumberLink.tap();
      messagesApp.Menu.selectContactPromptMenuOption('Send message');

      // Wait for the recipient input to be filled
      var recipients = messagesApp.NewMessage.recipients;
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
      // Try to send message to number that has thread associated with it
      var threadNumberLink = messagesApp.Conversation.message.findElement(
        '[data-dial="+400000"]'
      );
      threadNumberLink.tap();
      messagesApp.Menu.selectContactPromptMenuOption('Send message');

      // Verify that we entered the right thread
      var message = messagesApp.Conversation.message;
      assert.equal(
        messagesApp.Conversation.getMessageContent(message).text(),
        threads[0].messages[0].body
      );

      assertIsFocused(
        messagesApp.Composer.messageInput, 'Message input should be focused'
      );
    });
  });

  suite('Retrieve MMS', function() {
    var conversationView;
    setup(function() {
      var thread = ThreadGenerator.generate({
        messageType: 'mms',
        delivery: 'not-downloaded',
        attachments: [
          { type: 'image/png', width: 10,  height: 10 },
          { type: 'text/plain', content: 'Attachment' }
        ],
        expiryDate: Date.now() + 100000
      });

      messagesApp.launch();

      // Set empty messages and contacts store.
      storage.setMessagesStorage([thread], ThreadGenerator.uniqueMessageId);
      storage.setContactsStorage();

      var inboxView = new InboxView(client);

      conversationView = inboxView.goToConversation(thread.id);
    });

    test('MMS should be retrieved successfully', function() {
      var notDownloadedMessage = conversationView.messages[0];

      assert.isFalse(notDownloadedMessage.isDownloaded);
      assert.isFalse(notDownloadedMessage.isPending);
      assert.equal(notDownloadedMessage.attachments.length, 0);

      conversationView.downloadMessage(notDownloadedMessage.id);

      // Now old message should be removed and new message is received.
      var downloadedMessage;
      client.waitFor(function() {
        downloadedMessage = conversationView.findMessage(
          notDownloadedMessage.id
        );
        return downloadedMessage && downloadedMessage.isDownloaded;
      });

      assert.equal(downloadedMessage.attachments.length, 1);
      assert.equal(downloadedMessage.attachments[0].type, 'img');
      assert.equal(downloadedMessage.content.trim(), 'Attachment');
    });
  });
});
