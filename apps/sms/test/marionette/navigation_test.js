/* global require, marionette, setup, suite, test */
'use strict';

var assert = require('chai').assert;
var ThreadGenerator = require('./generators/thread');
var Messages = require('./lib/messages.js');
var Storage = require('./lib/storage.js');

marionette('Navigation Tests', function() {
  var client = marionette.client();

  var messagesApp, storage;

  function assertIsDisplayed(element) {
    assert.isTrue(element.displayed(), 'Element should be displayed');
  }

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

  suite('Edge case use cases', function() {
    suite('Double tap', function() {
      var thread;
      setup(function() {
        thread = ThreadGenerator.generate({
          numberOfMessages: 10
        });

        storage.setMessagesStorage([thread], ThreadGenerator.uniqueMessageId);

        messagesApp.launch();
      });

      test('Double tap on conversation and back', function() {
        messagesApp.Inbox.doubleTapOnFirstConversation();

        // Composer panel should always be visible
        assertIsDisplayed(messagesApp.Composer.sendButton);
        assertIsDisplayed(messagesApp.Composer.messageInput);

        messagesApp.performHeaderAction();

        // Wait for the thread list to appear
        messagesApp.Inbox.waitToAppear();
        assertIsDisplayed(messagesApp.Inbox.firstConversation);
      });
    });
  });
});
