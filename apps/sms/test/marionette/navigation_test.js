/* global require, marionette, setup, suite, test, __dirname */
'use strict';

var assert = require('chai').assert;
var ThreadGenerator = require('./generators/thread');
var Messages = require('./lib/messages.js');
var Storage = require('./lib/storage.js');

marionette('Navigation Tests', function() {
  var MOCKS = [
    '/mocks/mock_test_storages.js',
    '/mocks/mock_test_blobs.js',
    '/mocks/mock_navigator_moz_icc_manager.js',
    '/mocks/mock_navigator_moz_mobile_message.js',
    '/mocks/mock_navigator_moz_contacts.js'
  ];

  var client = marionette.client();

  var messagesApp, storage;

  function assertIsDisplayed(element) {
    assert.isTrue(element.displayed(), 'Element should be displayed');
  }

  setup(function() {
    messagesApp = Messages.create(client);
    storage = Storage.create(client);

    MOCKS.forEach(function(mock) {
      client.contentScript.inject(__dirname + mock);
    });
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
