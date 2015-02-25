
/* global require, marionette, setup, suite, test, __dirname */
'use strict';

var assert = require('chai').assert;

var Messages = require('./lib/messages.js');

marionette('Message Type Conversion Banner', function() {
  var apps = {};

  var client = marionette.client({
    prefs: {
      'focusmanager.testmode': true
    },
    settings: {
      'lockscreen.enabled': false,
      'ftu.manifestURL': null
    },

    apps: apps
  });

  var messagesApp, composer, threadList;

  function assertIsDisplayed(element) {
    assert.isTrue(element.displayed(), 'Element should be displayed');
  }

  function assertIsNotDisplayed(element) {
    assert.isFalse(element.displayed(), 'Element should not be displayed');
  }

  function waitForBannerToDisappear() {
    client.helper.waitForElementToDisappear(
      messagesApp.Composer.conversionBanner
    );
  }

  function exitThread(draftOption) {
    messagesApp.performHeaderAction();
    draftOption && messagesApp.selectAppMenuOption(draftOption);
    // Wait a little bit, much less than the time needed for the banner to
    // expire in order to give the render loop time to clear the banners.
    client.helper.wait(300);
  }

  setup(function() {
    messagesApp = Messages.create(client);
    composer = messagesApp.Composer;
    threadList = messagesApp.ThreadList;

    client.contentScript.inject(
      __dirname + '/mocks/mock_navigator_moz_icc_manager.js'
    );
    client.contentScript.inject(
      __dirname + '/mocks/mock_navigator_moz_mobile_message.js'
    );
  });

  suite('Message Type Conversion Banner for new threads', function() {

    setup(function() {
      messagesApp.launch();
      threadList.navigateToComposer();
    });

    test('Old conversion banner is cleared before entering a thread',
    function() {
      // Force it to be MMS
      messagesApp.addRecipient('a@b.c');
      // Without waiting for the banner to disappear, return to thread list
      exitThread('Discard');
      // Create another new message
      threadList.navigateToComposer();

      // The banner should not be displayed
      assertIsNotDisplayed(messagesApp.Composer.conversionBanner);
    });

    test('MMS to email conversion and reminders', function() {
      // Case #1: When we open composer initially we should see not banner while
      // we are in SMS mode.
      assertIsNotDisplayed(composer.conversionBanner);

      // Case #2: Add an email recipient and the message becomes MMS and the
      // banner should appear.
      messagesApp.addRecipient('a@b.c');
      assertIsDisplayed(composer.conversionBanner);

      // Case #3: Wait for the banner to disappear, then send a message to
      // be redirected to the thread view. We are still in MMS mode but no
      // banner should be displayed.
      waitForBannerToDisappear();
      composer.messageInput.tap();
      composer.messageInput.sendKeys('test');
      messagesApp.send();

      assertIsNotDisplayed(composer.conversionBanner);

      // Case #4: Return to threads view and re-enter the thread to be reminded
      // about being in a MMS thread.
      exitThread();
      threadList.firstThread.tap();
      client.helper.waitForElement(composer.conversionBanner);
    });
  });

  suite('Message Type Conversion Banner for pre-existent threads', function() {

    function navigateToSMSThread() {
      threadList.smsThread.tap();
    }

    function navigateToMMSThread() {
      threadList.mmsThread.tap();
    }

    function waitForThreadList() {
      client.helper.waitForElement(threadList.smsThread);
      client.helper.waitForElement(threadList.mmsThread);
    }

    function createSampleThreads() {
      // Create a simple SMS thread
      threadList.navigateToComposer();
      messagesApp.addRecipient('+1');
      composer.messageInput.sendKeys('Simple SMS thread.');
      messagesApp.send();
      messagesApp.performHeaderAction();

      // Create a MMS thread
      threadList.navigateToComposer();
      messagesApp.addRecipient('a@b.c');
      composer.messageInput.sendKeys('MMS thread.');
      messagesApp.send();
      messagesApp.performHeaderAction();
    }

    setup(function() {
      messagesApp.launch();
      createSampleThreads();
      waitForThreadList();
    });

    test('The banner is not shown after sending another message',
    function() {
      navigateToMMSThread();
      messagesApp.Composer.messageInput.sendKeys('Another message');
      waitForBannerToDisappear();
      messagesApp.send();

      assertIsNotDisplayed(composer.conversionBanner);
    });

    test('The banner for SMS is not shown when entering a SMS thread after ' +
    'visiting a MMS thread', function() {
      navigateToMMSThread();
      exitThread();
      waitForThreadList();
      navigateToSMSThread();

      assertIsNotDisplayed(composer.conversionBanner);
    });
  });
});
