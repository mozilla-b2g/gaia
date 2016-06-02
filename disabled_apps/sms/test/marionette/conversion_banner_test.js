/* global require, marionette, setup, suite, test */
'use strict';

var assert = require('chai').assert;

var Messages = require('./lib/messages.js');
var Storage = require('./lib/storage.js');
var ThreadGenerator = require('./generators/thread');

marionette('Message Type Conversion Banner', function() {
  var apps = {};

  var client = marionette.client({
    profile: {
      prefs: {
        'focusmanager.testmode': true
      },

      apps: apps
    },
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });

  var messagesApp, storage, composer, inbox, newMessage;

  function assertIsDisplayed(element) {
    assert.isTrue(element.displayed(), 'Element should be displayed');
  }

  function assertIsNotDisplayed(element) {
    assert.isFalse(element.displayed(), 'Element should not be displayed');
  }

  function waitForBannerToDisappear() {
    client.helper.waitForElementToDisappear(newMessage.conversionBanner);
  }

  function exitConversation() {
    messagesApp.performHeaderAction();

    // Wait for the thread list to appear
    inbox.waitToAppear();

    // Wait a little bit, much less than the time needed for the banner to
    // expire in order to give the render loop time to clear the banners.
    client.helper.wait(300);
  }

  setup(function() {
    messagesApp = Messages.create(client);
    storage = Storage.create(client);

    composer = messagesApp.Composer;
    inbox = messagesApp.Inbox;
    newMessage = messagesApp.NewMessage;

    client.loader.getMockManager('sms').inject([
      'test_storages',
      'test_blobs',
      'navigator_moz_icc_manager',
      'navigator_moz_mobile_message'
    ]);
  });

  suite('Message Type Conversion Banner for new threads', function() {
    setup(function() {
      messagesApp.launch();

      inbox.navigateToComposer();
    });

    test('Old conversion banner is cleared before entering a thread',
    function() {
      // Force it to be MMS
      messagesApp.addRecipient('a@b.c');
      // Without waiting for the banner to disappear, return to thread list
      exitConversation();
      // Create another new message
      inbox.navigateToComposer();

      // The banner should not be displayed
      assertIsNotDisplayed(newMessage.conversionBanner);
    });

    test('MMS to email conversion and reminders', function() {
      // Case #1: When we open composer initially we should see not banner while
      // we are in SMS mode.
      assertIsNotDisplayed(newMessage.conversionBanner);

      // Case #2: Add an email recipient and the message becomes MMS and the
      // banner should appear.
      messagesApp.addRecipient('a@b.c');
      assertIsDisplayed(newMessage.conversionBanner);

      // Case #3: Wait for the banner to disappear, then send a message to
      // be redirected to the thread view. We are still in MMS mode but no
      // banner should be displayed.
      waitForBannerToDisappear();
      composer.messageInput.tap();
      composer.messageInput.sendKeys('test');
      messagesApp.send();

      assertIsNotDisplayed(newMessage.conversionBanner);

      // Case #4: Return to threads view and re-enter the thread to be reminded
      // about being in a MMS thread.
      exitConversation();
      inbox.firstConversation.tap();
      client.helper.waitForElement(newMessage.conversionBanner);
    });
  });

  suite('Message Type Conversion Banner for pre-existent threads', function() {
    function navigateToSMSConversation() {
      inbox.smsConversation.tap();
      messagesApp.Conversation.waitToAppear();
    }

    function navigateToMMSConversation() {
      inbox.mmsConversation.tap();
      messagesApp.Conversation.waitToAppear();
    }

    setup(function() {
      var smsThread = ThreadGenerator.generate();
      var mmsThread = ThreadGenerator.generate({
        numberOfMessages: 1,
        messageType: 'mms',
        participants: ['a@b.c'],
        attachments: [
          { type: 'image/png', width: 10,  height: 10 },
          { type: 'text/plain', content: 'Email attachment' }
        ]
      });

      storage.setMessagesStorage(
        [smsThread, mmsThread],
        ThreadGenerator.uniqueMessageId
      );
      messagesApp.launch();
    });

    test('The banner is not shown after sending another message',
    function() {
      navigateToMMSConversation();
      composer.messageInput.sendKeys('Another message');
      waitForBannerToDisappear();
      messagesApp.send();

      assertIsNotDisplayed(newMessage.conversionBanner);
    });

    test('The banner for SMS is not shown when entering a SMS thread after ' +
    'visiting a MMS thread', function() {
      navigateToMMSConversation();
      exitConversation();
      navigateToSMSConversation();

      assertIsNotDisplayed(newMessage.conversionBanner);
    });
  });
});
