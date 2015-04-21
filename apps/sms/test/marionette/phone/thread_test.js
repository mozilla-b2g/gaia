/* global require, marionette, setup, suite, test, __dirname */
'use strict';

var assert = require('chai').assert;

var Messages = require('../lib/messages.js');

marionette('Thread Panel Tests', function() {
  var apps = {};

  var client = marionette.client({
    apps: apps
  });

  var messagesApp;

  function assertIsDisplayed(element) {
    assert.isTrue(element.displayed(), 'Element should be displayed');
  }

  setup(function() {
    messagesApp = Messages.create(client);

    client.contentScript.inject(
      __dirname + '/../mocks/mock_test_storages.js'
    );
    client.contentScript.inject(
      __dirname + '/../mocks/mock_navigator_moz_icc_manager.js'
    );
    client.contentScript.inject(
      __dirname + '/../mocks/mock_navigator_moz_mobile_message.js'
    );
  });

  suite('General use cases', function() {
    suite('Long SMS thread', function() {
      var thread;
      setup(function() {
        thread = {
          id: 1,
          body: 'Thread message content',
          lastMessageType: 'sms',
          timestamp: Date.now(),
          messages: [],
          participants: ['+123']
        };

        var uniqueIdCounter;
        for (uniqueIdCounter = 1; uniqueIdCounter < 50; uniqueIdCounter++) {
          thread.messages.push({
            id: uniqueIdCounter,
            iccId: null,
            threadId: thread.id,
            sender: null,
            receiver: 'TestMan',
            type: 'sms',
            delivery: 'sent',
            body: 'Thread message content ' + uniqueIdCounter,
            timestamp: Date.now()
          });
        }

        messagesApp.launch();

        messagesApp.setStorage([thread], uniqueIdCounter);
      });

      test('User can see all messages when scrolls up', function() {
        var pageSize = 10;
        var loadedPage = 1;

        messagesApp.ThreadList.firstThread.tap();

        // Composer panel should always be visible
        assertIsDisplayed(messagesApp.Composer.sendButton);
        assertIsDisplayed(messagesApp.Composer.messageInput);

        thread.messages.forEach(function(message, index) {
          var messageNode = messagesApp.Thread.findMessage(message.id);

          // If current page is loaded, then message node should be visible
          if (index < pageSize * loadedPage) {
            client.helper.waitForElement(messageNode);
          } else {
            // Otherwise, node may not be visible and we should scroll up to
            // see it
            messagesApp.Thread.scrollUp();
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
      // Set empty as message/thread storage.
      messagesApp.setStorage();
      messagesApp.ThreadList.navigateToComposer();

      // Create new thread from the scratch
      messagesApp.addRecipient('+1');
      messagesApp.Composer.messageInput.sendKeys('message');
      messagesApp.send();
    });

    test('Header should be updated accordingly', function() {
      client.helper.waitForElement(messagesApp.Thread.message);

      assert.equal(
        messagesApp.Thread.headerTitle.text(),
        '+1',
        'Header title should display contact phone number'
      );

      // Forward message
      messagesApp.contextMenu(messagesApp.Thread.message);
      messagesApp.selectAppMenuOption('Forward');
      // Wait for message to be forwarded to fill out composer fields
      client.waitFor(function() {
        return messagesApp.Composer.messageInput.text() === 'message';
      });

      assert.equal(
        messagesApp.Thread.headerTitle.text(),
        'New message',
        'Header title should indicate that we are composing new message'
      );
    });
  });
});
