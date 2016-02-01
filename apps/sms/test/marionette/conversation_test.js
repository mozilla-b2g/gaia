/* global require, marionette, setup, suite, test, __dirname */
'use strict';

var assert = require('chai').assert;
var _ = require('SMS/node_modules/lodash');

var ThreadGenerator = require('./generators/thread');
var Messages = require('./lib/messages.js');
var InboxView = require('./lib/views/inbox/view');
var Storage = require('./lib/storage.js');
var Tools = require('./lib/views/shared/tools.js');
var MessagesActivityCaller = require('./lib/messages_activity_caller.js');
var Keyboard = require('../../../keyboard/test/marionette/lib/keyboard.js');

marionette('Conversation Panel Tests', function() {
  var apps = {};
  apps[MessagesActivityCaller.ORIGIN] = __dirname + '/apps/activitycaller';

  var client = marionette.client({
    desiredCapabilities: { raisesAccessibilityExceptions: false },
    profile: {
      prefs: {
        'focusmanager.testmode': true
      },

      apps: apps
    }
  });

  var messagesApp, storage, activityCallerApp, keyboardApp;

  function assertIsDisplayed(element) {
    assert.isTrue(element.displayed(), 'Element should be displayed');
  }

  setup(function() {
    messagesApp = Messages.create(client);
    keyboardApp = new Keyboard(client);
    storage = Storage.create(client);
    activityCallerApp = MessagesActivityCaller.create(client);

    client.loader.getMockManager('sms').inject([
      'test_storages',
      'test_blobs',
      'navigator_moz_icc_manager',
      'navigator_moz_mobile_message',
      'navigator_moz_contacts'
    ]);
  });

  suite('General use cases', function() {
    suite('Long SMS thread', function() {
      var thread;
      setup(function() {
        thread = ThreadGenerator.generate({
          numberOfMessages: 150
        });
        storage.setMessagesStorage([thread], ThreadGenerator.uniqueMessageId);
        messagesApp.launch();
      });

      test('User can see all messages when scrolls up', function() {
        messagesApp.Inbox.firstConversation.tap();

        // Composer panel should always be visible
        assertIsDisplayed(messagesApp.Composer.sendButton);
        assertIsDisplayed(messagesApp.Composer.messageInput);

        thread.messages.forEach(function(message) {
          var messageNode = messagesApp.Conversation.findMessage(message.id);

          // If node is not visible, let's just scroll up and wait until it
          // becomes visible.
          if (!messageNode.displayed()) {
            client.waitFor(function() {
              messagesApp.Conversation.scrollUp();
              return messageNode.displayed();
            });
          }
        });

        assertIsDisplayed(messagesApp.Composer.sendButton);
        assertIsDisplayed(messagesApp.Composer.messageInput);
      });
    });


    suite('Long MMS thread', function() {
      var thread;
      var inboxView;
      var attachmentScreenshot;

      suiteSetup(function() {
        attachmentScreenshot = Tools.loadAsset('mms-attachment.png');
      });

      suiteTeardown(function() {
        attachmentScreenshot = null;
      });

      setup(function() {
        thread = ThreadGenerator.generate({
          numberOfMessages: 150,
          baseTimestamp: Date.UTC(2015, 8, 1, 13, 40),
          messageType: 'mms',
          attachments: [
            { type: 'image/png', width: 10, height: 10 }
          ]
        });

        storage.setMessagesStorage([thread], ThreadGenerator.uniqueMessageId);
        messagesApp.launch();

        inboxView = new InboxView(client);
      });

      test('MMS are properly displayed after going to a subview', function() {
        var conversationView = inboxView.goToConversation(thread.id);
        conversationView.waitForFullRendering(thread);

        var recentId = thread.messages[0].id;
        var reportView = conversationView.openReport(recentId);
        reportView.back();

        var message = conversationView.findMessage(recentId);
        var screenshot = message.attachments[0].screenshot();
        assert.equal(screenshot, attachmentScreenshot);

        conversationView.fakeScrollUpTo(0);

        // Find the first displayed message. Displayed does not especially mean
        // that we see it in the viewport, it merely means it's not "hidden"
        // using CSS (eg: "display: none" here).
        // I want to find the topmost already displayed message, and then scroll
        // to it so that Gecko tries to load the attachment's background image.
        var displayedMessage = _.find(
          conversationView.messages(),
          function(message) { return message.isDisplayed; }
        );

        conversationView.fakeScrollUpTo(0);

        screenshot = displayedMessage.attachments[0].screenshot();
        assert.equal(screenshot, attachmentScreenshot);
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

      storage.setMessagesStorage(
        [smsThread, mmsThread],
        ThreadGenerator.uniqueMessageId
      );
      messagesApp.launch();
    });

    test('Forward a SMS', function() {
      messagesApp.Inbox.findConversation(smsThread.id).tap();

      // Forward message
      messagesApp.contextMenu(messagesApp.Conversation.message);
      messagesApp.Menu.selectAppMenuOption('Forward');
      // Wait for message to be forwarded to fill out composer fields
      client.waitFor(function() {
        return messagesApp.Composer.messageInput.text() !== '';
      });

      assert.equal(
        messagesApp.Composer.messageInput.text(),
        smsThread.messages[0].body,
        'Forwarded body is the initial body'
      );

      assert.equal(
        messagesApp.Conversation.headerTitle.text(),
        'New message',
        'Header title should indicate that we are composing new message'
      );

      Tools.assertElementFocused(
        messagesApp.NewMessage.recipientsInput,
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

      var composerAttachments =  messagesApp.Composer.attachments;
      assert.equal(composerAttachments.length, 1);
      assert.equal(
        composerAttachments[0].getAttribute('data-attachment-type'), 'img'
      );

      assert.equal(
        messagesApp.Conversation.headerTitle.text(),
        'New message',
        'Header title should indicate that we are composing new message'
      );

      Tools.assertElementFocused(
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

      storage.setMessagesStorage(threads, ThreadGenerator.uniqueMessageId);

      storage.setContactsStorage([{
        name: ['Alan Turing'],
        tel: [{
          value: '+300000',
          type: 'Mobile'
        }]
      }]);

      messagesApp.launch();

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

      Tools.assertElementFocused(
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

      Tools.assertElementFocused(
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

      Tools.assertElementFocused(
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

      storage.setMessagesStorage([thread], ThreadGenerator.uniqueMessageId);

      messagesApp.launch();

      var inboxView = new InboxView(client);

      conversationView = inboxView.goToConversation(thread.id);
    });

    test('MMS should be retrieved successfully', function() {
      var notDownloadedMessage = conversationView.messages()[0];

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

  suite('Edit Mode', function() {
    var thread, conversationView;
    setup(function() {
      thread = ThreadGenerator.generate({
        numberOfMessages: 4
      });

      storage.setMessagesStorage([thread], ThreadGenerator.uniqueMessageId);

      messagesApp.launch();

      var inboxView = new InboxView(client);
      conversationView = inboxView.goToConversation(thread.id);
    });

    test('User can enter and exit edit mode', function () {
      conversationView.enterEditMode();

      conversationView.messages().forEach(function(message) {
        assert.isTrue(message.isInEditMode);
      });

      conversationView.exitEditMode();

      conversationView.messages().forEach(function(message) {
        assert.isFalse(message.isInEditMode);
      });
    });

    suite('Toggle selection button behavior', function() {
      setup(function() {
        conversationView.enterEditMode();
      });

      test('User can select/deselect all messages at once', function () {
        // Selecting all messages
        conversationView.toggleMessagesSelection();

        conversationView.messages().forEach(function(message) {
          assert.isTrue(message.isSelected);
        });
        assert.equal(
          conversationView.toggleSelectionButtonTitle,
          'Deselect all',
          'Select / Deselect all button should display correct text'
        );
        assert.equal(
          conversationView.editHeaderTitle,
          '4 selected',
          'Edit mode header should show correct number of messages'
        );

        // Deselecting all messages
        conversationView.toggleMessagesSelection();

        conversationView.messages().forEach(function(message) {
          assert.isFalse(message.isSelected);
        });
        assert.equal(
          conversationView.toggleSelectionButtonTitle,
          'Select all',
          'Select / Deselect all button should display correct text'
        );
        assert.equal(
          conversationView.editHeaderTitle,
          'Delete messages',
          'Edit mode header should not indicate that any message is selected'
        );
      });

      test('User selects a few and then selects/deselects all', function() {
        // Selecting the 1st and 3rd message
        var messageIndicesToSelect = [2, 0];

        var messages = conversationView.messages();

        messageIndicesToSelect.forEach(function(messageIndex) {
          conversationView.tapOnMessage(messages[messageIndex].id);
        });

        conversationView.messages().forEach(function(message, index) {
          if (messageIndicesToSelect.indexOf(index) >= 0) {
            assert.isTrue(message.isSelected);
          } else {
            assert.isFalse(message.isSelected);
          }
        });
        assert.equal(
          conversationView.editHeaderTitle,
          '2 selected',
          'Edit mode header should show correct number of messages'
        );

        // Selecting all messages
        conversationView.toggleMessagesSelection();

        conversationView.messages().forEach(function(message) {
          assert.isTrue(message.isSelected);
        });
        assert.equal(
          conversationView.toggleSelectionButtonTitle,
          'Deselect all',
          'Select / Deselect all button should display correct text'
        );
        assert.equal(
          conversationView.editHeaderTitle,
          '4 selected',
          'Edit mode header should show correct number of messages'
        );

        // Deselecting all messages
        conversationView.toggleMessagesSelection();

        conversationView.messages().forEach(function(message) {
          assert.isFalse(message.isSelected);
        });
        assert.equal(
          conversationView.toggleSelectionButtonTitle,
          'Select all',
          'Select / Deselect all button should display correct text'
        );
        assert.equal(
          conversationView.editHeaderTitle,
          'Delete messages',
          'Edit mode header should not indicate that any message is selected'
        );
      });

      test('User selects all, deselects some, selects all', function() {
        // Selecting all messages
        conversationView.toggleMessagesSelection();

        conversationView.messages().forEach(function(message) {
          assert.isTrue(message.isSelected);
        });
        assert.equal(
          conversationView.toggleSelectionButtonTitle,
          'Deselect all',
          'Select / Deselect all button should display correct text'
        );
        assert.equal(
          conversationView.editHeaderTitle,
          '4 selected',
          'Edit mode header should show correct number of messages'
        );

        // Deselecting 1st and 3rd message
        var messageIndicesToDeselect = [2, 0];

        var messages = conversationView.messages();

        messageIndicesToDeselect.forEach(function(messageIndex) {
          conversationView.tapOnMessage(messages[messageIndex].id);
        });

        conversationView.messages().forEach(function(message, index) {
          if (messageIndicesToDeselect.indexOf(index) >= 0) {
            assert.isFalse(message.isSelected);
          } else {
            assert.isTrue(message.isSelected);
          }
        });
        assert.equal(
          conversationView.editHeaderTitle,
          '2 selected',
          'Edit mode header should show correct number of messages'
        );

        // Selecting all messages
        conversationView.toggleMessagesSelection();

        conversationView.messages().forEach(function(message) {
          assert.isTrue(message.isSelected);
        });
        assert.equal(
          conversationView.toggleSelectionButtonTitle,
          'Deselect all',
          'Select / Deselect all button should display correct text'
        );
        assert.equal(
          conversationView.editHeaderTitle,
          '4 selected',
          'Edit mode header should show correct number of messages'
        );
      });
    });
  });

  suite('Add recipients from thread', function() {
    var conversationView;
    setup(function() {
      var thread = ThreadGenerator.generate({
        numberOfMessages: 1
      });
      storage.setMessagesStorage([thread], ThreadGenerator.uniqueMessageId);

      messagesApp.launch();

      var inboxView = new InboxView(client);
      conversationView = inboxView.goToConversation(thread.id);
    });

    test('With empty composer: recipients should be kept',
    function() {
      var newMessageView = conversationView.includeSomeoneElse();
      // this also ensure we are on Composer view
      assert.equal(newMessageView.recipients, '+123',
          'Recipients should be kept');
      assert.equal(newMessageView.messageText, '', 'SMS text should be empty');

      // add a recipient, a subject and send a mms to create a thread with
      // several recipients
      newMessageView.typeMessage('message2');
      newMessageView.addNewRecipient('+234');

      newMessageView.showSubject();
      newMessageView.typeSubject('subject1');
      conversationView = newMessageView.send();

      newMessageView = conversationView.includeSomeoneElse();
      var recipients = newMessageView.recipients;
      assert.lengthOf(recipients, 2, 'There should be 2 recipients');
      assert.include(recipients, '+123', '+123 should be in the recipients');
      assert.include(recipients, '+234', '+234 should be in the recipients');
      assert.equal(newMessageView.messageText, '', 'MMS text should be empty');
    });

    test('Sms being written: message and recipients should be kept',
    function() {
      conversationView.typeMessage('message2');
      var newMessageView = conversationView.includeSomeoneElse();
      assert.equal(newMessageView.recipients, '+123',
        'Recipient should be +123');
      assert.equal(newMessageView.messageText, 'message2',
        'message text should be kept');
    });

    test('Mms being written: all info must be kept', function() {
      conversationView.typeMessage('message2');
      // add a subject
      conversationView.showSubject();
      conversationView.typeSubject('subject1');
      var newMessageView = conversationView.includeSomeoneElse();

      // assert that we kept all the infos
      assert.equal(newMessageView.recipients, '+123',
        'Recipient should be +123');
      assert.equal(newMessageView.messageText, 'message2',
        'Message text should be kept');
      assert.equal(newMessageView.subject, 'subject1',
        'Subject should be kept');

      // let's add a recipients and send the message.
      // we will have a thread with several recipients
      newMessageView.addNewRecipient('+234');
      conversationView = newMessageView.send();
      // write another MMS
      conversationView.typeMessage('message3');
      conversationView.showSubject();
      conversationView.typeSubject('subject2');
      // add a blob
      conversationView.addAttachment().choose('Messages Activity Caller')
        .pickImage();
      messagesApp.switchTo();
      // take screenshot of current attachment to compare it later
      var beforeScreenshot = conversationView
        .takeComposerAttachmentScreenshot(0);

      // redirect to new message to add recipients
      newMessageView = conversationView.includeSomeoneElse();

      // assert the content
      var recipients = newMessageView.recipients;
      assert.lengthOf(recipients, 2, 'There should be 2 recipients');
      assert.include(recipients, '+123', '+123 should be in the recipients');
      assert.include(recipients, '+234', '+234 should be in the recipients');
      assert.equal(newMessageView.messageText, 'message3',
        'Message text should be kept');
      assert.equal(newMessageView.subject, 'subject2',
        'Subject should be kept');

      // hide the keyboard: when it is displayed, the attachment is hidden,
      // which prevents the screenshot to be taken
      client.switchToFrame();
      var systemInputMgmt = client.loader.getAppClass(
        'system', 'input_management'
      );
      systemInputMgmt.waitForKeyboardFrameDisplayed();
      keyboardApp.switchTo();
      keyboardApp.longPressSpaceBar(0.7);
      client.switchToFrame();
      // wait for the keyboard to be hidden
      systemInputMgmt.waitForKeyboardFrameHidden();

      messagesApp.switchTo();
      assert.equal(
        beforeScreenshot,
        newMessageView.takeComposerAttachmentScreenshot(0)
      );
    });
  });
});
