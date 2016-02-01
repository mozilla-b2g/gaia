/* global require, marionette, setup, suite, test */
'use strict';

var assert = require('chai').assert;

var ThreadGenerator = require('./generators/thread');
var Messages = require('./lib/messages.js');
var Storage = require('./lib/storage.js');
var InboxView = require('./lib/views/inbox/view');
var UtilityTray = require('../../../system/test/marionette/lib/utility_tray');
var NotificationList = require(
  '../../../system/test/marionette/lib/notification.js'
).NotificationList;

marionette('Message notification tests', function() {
  var client = marionette.client({
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });

  var messagesApp, storage, notificationList, utilityTray, system;

  function assertIsNotFocused(element, message) {
    assert.isTrue(element.scriptWith(function(el) {
      return document.activeElement !== el;
    }), message);
  }

  setup(function() {
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
    messagesApp = Messages.create(client);
    storage = Storage.create(client);
    notificationList = new NotificationList(client);
    utilityTray = new UtilityTray(client);

    client.loader.getMockManager('sms').inject([
      'test_storages',
      'test_blobs',
      'navigator_moz_icc_manager',
      'navigator_moz_mobile_message'
    ]);
  });

  suite('Run application via notification', function() {
    var smsMessage;

    function openNotification() {
      client.switchToFrame();
      notificationList.waitForNotificationCount(1);

      utilityTray.open();
      utilityTray.waitForOpened();

      // Make sure we have our notification to click and tap on it.
      notificationList.refresh();
      notificationList.tap(
        notificationList.getForApp(messagesApp.manifestURL)[0]
      );

      // Switch to messages so that it's able to remove notification.
      messagesApp.switchTo();
      // Make sure we enter conversation view directly.
      assert.equal(messagesApp.getActivePanelName(), 'ConversationView');

      // Verify that notification has been removed.
      client.switchToFrame();
      notificationList.waitForNotificationCount(0);

      messagesApp.switchTo();
    }

    function removeNotification() {
      client.switchToFrame();
      notificationList.waitForNotificationCount(1);

      utilityTray.open();
      utilityTray.waitForOpened();

      // Make sure we have our notification to remove.
      notificationList.refresh();

      var notificationNode = client.helper.waitForElement(
        notificationList.getForApp(messagesApp.manifestURL)[0].query
      );

      // flick() sends a sequence of touch events that allows us to simulate
      // swipe from left (x1=5) to right (x2=125) within 100ms period of time.
      client.loader.getActions().flick(
        notificationNode, 5, 15, 125, 15, 100
      ).perform();

      utilityTray.close();
      utilityTray.waitForClosed();

      // Switch to messages so that it's able to remove notification.
      messagesApp.launch();
      messagesApp.switchTo();

      // Verify that notification has been removed.
      client.switchToFrame();
      notificationList.waitForNotificationCount(0);

      messagesApp.switchTo();
    }

    function assertMessagesIsInCorrectState() {
      // Verify that we entered the right thread
      var message = messagesApp.Conversation.message;
      assert.equal(
        messagesApp.Conversation.getMessageContent(message).text(),
        smsMessage.body
      );

      assert.isFalse(messagesApp.Composer.sendButton.enabled());

      // Validate that header is correctly set even that thread list hasn't
      // been loaded yet.
      assert.equal(
        messagesApp.Conversation.headerTitle.text(), smsMessage.sender
      );

      // When we open thread from notification, message input should not be
      // focused.
      assertIsNotFocused(
        messagesApp.Composer.messageInput, 'Message input should not be focused'
      );
    }

    setup(function() {
      smsMessage = {
        id: 1,
        iccId: null,
        threadId: 1,
        sender: '+100',
        receiver: null,
        type: 'sms',
        delivery: 'received',
        body: 'Workload message',
        timestamp: Date.now()
      };

      storage.setMessagesStorage([{
        id: smsMessage.threadId,
        body: smsMessage.body,
        lastMessageType: smsMessage.type,
        timestamp: smsMessage.timestamp,
        messages: [smsMessage],
        participants: [smsMessage.sender]
      }]);
    });

    test('when "notification" system message is generated', function() {
      // Receive 'notification' system message and fill up the storage.
      messagesApp.sendSystemMessage('notification', {
        clicked: true,
        data: { threadId: smsMessage.threadId, id: smsMessage.id }
      });
      messagesApp.switchTo();

      assertMessagesIsInCorrectState();
    });

    test('when user taps on notification in Utility tray', function() {
      // Receive 'sms-received' system message and generate notification.
      messagesApp.sendSystemMessage('sms-received', smsMessage);

      // We should make Messages app visible, otherwise switchToApp won't work.
      messagesApp.launch();

      // Switch to system app to be sure that notification is generated.
      client.switchToFrame();
      notificationList.waitForNotificationCount(1);

      // Close Message app since we want to run fresh instance.
      messagesApp.close();

      openNotification();

      assertMessagesIsInCorrectState();

      // Let's go to the inbox and see if we still can receive new messages.
      messagesApp.switchTo();
      messagesApp.performHeaderAction();
      messagesApp.Inbox.waitToAppear();

      messagesApp.sendSystemMessage('sms-received', smsMessage);

      openNotification();

      assertMessagesIsInCorrectState();
    });

    test('when user removes notification from Utility tray', function() {
      // Receive 'sms-received' system message and generate notification.
      messagesApp.sendSystemMessage('sms-received', smsMessage);

      // We should make Messages app visible, otherwise switchToApp won't work.
      messagesApp.launch();

      // Switch to system app to be sure that notification is generated.
      client.switchToFrame();
      notificationList.waitForNotificationCount(1);

      // Close Message app since we want to run fresh instance.
      messagesApp.close();

      removeNotification();

      // When notication is removed Messages is run to handle corresponding
      // system message, in this case app should be in valid state i.e. it
      // should have correctly initialized inbox view.
      var inboxView = new InboxView(client);
      var conversations = inboxView.conversations;

      assert.equal(conversations.length, 1);
      assert.equal(conversations[0].title, smsMessage.sender);

      // Let's make sure that we still can receive new messages.
      messagesApp.sendSystemMessage('sms-received', smsMessage);

      openNotification();

      assertMessagesIsInCorrectState();
    });
  });

  suite('Display a conversation from a notification', function() {
    var thread1, thread2;

    setup(function() {
      thread1 = ThreadGenerator.generate({
        numberOfMessages: 500,
        participants: ['999']
      });
      thread2 = ThreadGenerator.generate({
        numberOfMessages: 5,
        participants: ['888']
      });

      storage.setMessagesStorage(
        [thread1, thread2], ThreadGenerator.uniqueMessageId
      );
    });

    test('Clicking a notification while a conversation is loading', function() {
      messagesApp.launch();

      var inbox = new InboxView(client);
      var conversation = inbox.goToConversation(thread1.id);

      // Receive 'notification' system message and fill up the storage.
      messagesApp.sendSystemMessage('notification', {
        clicked: true,
        data: { threadId: thread2.id, id: thread2.messages[0].id }
      });

      var thread2Ids = thread2.messages.map(
        function(message) { return message.id; }
      );

      // Our testing strategy is:
      // 1. Wait that all messages are rendered for thread2.
      thread2Ids.forEach(function(messageId) {
        conversation.findMessage(messageId);
      });

      // 2. Look at all rendered messages and see if one of these is part of
      // thread1.
      conversation.messages(
        { first: thread2Ids.length + 1 }
      ).forEach(function(message) {
        assert.include(
          thread2Ids, message.id,
          'Message ' + message.id + ' is in thread 2'
        );
      });
    });
  });
});
