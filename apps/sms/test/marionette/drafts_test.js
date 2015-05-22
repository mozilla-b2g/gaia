/* global require, marionette, setup, suite, test, __dirname */
'use strict';

var assert = require('chai').assert;

var Messages = require('./lib/messages.js');
var MessagesActivityCaller = require('./lib/messages_activity_caller.js');
var Storage = require('./lib/storage.js');

marionette('Messages Drafts', function() {
  var MOCKS = [
    '/mocks/mock_test_storages.js',
    '/mocks/mock_navigator_moz_mobile_message.js'
  ];

  var apps = {};

  apps[MessagesActivityCaller.ORIGIN] = __dirname + '/apps/activitycaller';

  var client = marionette.client({
    profile: {
      prefs: {
        'focusmanager.testmode': true
      },

      apps: apps
    }
  });

  var messagesApp, activityCallerApp, storage;

  function createAndSaveDraft(draft) {
    // Add text content.
    if (draft.text) {
      messagesApp.Composer.messageInput.tap();
      messagesApp.Composer.messageInput.sendKeys(draft.text);
    }

    // Add subject.
    if (draft.subject) {
      messagesApp.showSubject();
      messagesApp.Composer.subjectInput.sendKeys(draft.subject);
    }

    // Add recipient.
    if (draft.recipients) {
      draft.recipients.forEach(function(recipient) {
        messagesApp.addRecipient(recipient);
      });
    }

    // Add attachment.
    if (draft.shouldHaveAttachment) {
      client.waitFor(function() {
        return messagesApp.Composer.attachButton.enabled();
      });
      messagesApp.Composer.attachButton.tap();
      messagesApp.selectSystemMenuOption('Messages Activity Caller');

      activityCallerApp.switchTo();
      activityCallerApp.pickImage();
    }

    messagesApp.switchTo();
    messagesApp.performHeaderAction();

    messagesApp.selectAppMenuOption('Save as Draft');
  }

  function assertDraft(draft) {
    var conversation = messagesApp.Inbox.firstConversation;
    assert.ok(conversation.getAttribute('class').indexOf('draft') !== -1);

    // Navigate to drafts (it may be either Conversation or Composer)
    conversation.tap();
    messagesApp.Conversation.waitToAppear();

    // Check that recipient is loaded from draft.
    if (draft.recipients) {
      var recipients = messagesApp.Composer.recipients;
      assert.equal(recipients.length, draft.recipients.length);

      draft.recipients.forEach(function(recipient, index) {
        assert.equal(recipients[index].text(), recipient);
      });
    }

    // Check that text content is loaded.
    if (draft.text) {
      assert.equal(messagesApp.Composer.messageInput.text().trim(), draft.text);
    }

    // Check that subject is loaded.
    if (draft.subject) {
      assert.isTrue(messagesApp.Composer.subjectInput.displayed());
      assert.equal(messagesApp.Composer.subjectInput.text(), draft.subject);
    }

    // Check that attachment is loaded.
    if (draft.shouldHaveAttachment) {
      assert.ok(messagesApp.Composer.attachment);
    }
  }

  setup(function() {
    messagesApp = Messages.create(client);
    activityCallerApp = MessagesActivityCaller.create(client);
    storage = Storage.create(client);

    MOCKS.forEach(function(mock) {
      client.contentScript.inject(__dirname + mock);
    });
  });

  suite('Messages Drafts Test Suite', function() {
    var smsMessage, draft, messagesStorage;
    setup(function() {
      smsMessage = {
        id: 1,
        iccId: null,
        threadId: 1,
        sender: null,
        receiver: '+200',
        type: 'sms',
        delivery: 'sent',
        body: 'Workload message',
        timestamp: Date.now()
      };

      draft = {
        text: 'some message',
        subject: 'some subject',
        recipients: ['+123'],
        shouldHaveAttachment: true
      };

      messagesStorage = [{
        id: smsMessage.threadId,
        body: smsMessage.body,
        lastMessageType: smsMessage.type,
        timestamp: smsMessage.timestamp,
        messages: [smsMessage],
        participants: [smsMessage.receiver]
      }];

      messagesApp.launch();
      storage.setMessagesStorage(messagesStorage);
    });

    test('Draft is correctly saved', function() {
      messagesApp.Inbox.navigateToComposer();

      createAndSaveDraft(draft);

      assertDraft(draft);

      // Relaunch application and verify draft is persisted.
      messagesApp.close();
      messagesApp.launch();
      storage.setMessagesStorage(messagesStorage);

      assertDraft(draft);
    });

    test('Thread draft is correctly saved', function() {
      // Thread draft can't contain any recipients.
      delete draft.recipients;

      messagesApp.Inbox.firstConversation.tap();
      messagesApp.Conversation.waitToAppear();

      createAndSaveDraft(draft);

      assertDraft(draft);

      // Relaunch application and verify draft is persisted.
      messagesApp.close();
      messagesApp.launch();
      storage.setMessagesStorage(messagesStorage);

      assertDraft(draft);
    });
  });
});
