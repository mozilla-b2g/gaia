/* global require, marionette, setup, suite, test */
'use strict';

var assert = require('chai').assert;

var Messages = require('./lib/messages.js');
var Storage = require('./lib/storage.js');
var ThreadGenerator = require('./generators/thread');
var InboxView = require('./lib/views/inbox/view');
var DialogView = require('./lib/views/dialog/view');
var NotificationList = require(
  '../../../system/test/marionette/lib/notification.js'
).NotificationList;

marionette('Incoming messages tests', function() {
  var client = marionette.client();

  var messagesApp, storage, notificationList, system;

  setup(function() {
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();

    messagesApp = Messages.create(client);
    storage = Storage.create(client);
    notificationList = new NotificationList(client);

    client.loader.getMockManager('sms').inject([
      'test_storages',
      'test_blobs',
      'navigator_moz_icc_manager',
      'navigator_moz_mobile_message'
    ]);
  });

  suite('SMS received', function() {
    var smsMessage;

    setup(function() {
      smsMessage = ThreadGenerator.generateSMS({
        threadId: 1,
        delivery: 'received',
        sender: '+100',
        body: 'Brand new message'
      });

      storage.setMessagesStorage([{
        id: smsMessage.threadId,
        body: smsMessage.body,
        lastMessageType: smsMessage.type,
        timestamp: smsMessage.timestamp,
        messages: [smsMessage],
        participants: [smsMessage.sender]
      }]);
    });

    test('Incoming message notification is displayed correctly', function() {
      // Receive 'sms-received' system message and generate notification.
      messagesApp.sendSystemMessage('sms-received', smsMessage);

      // We should make Messages app visible, otherwise switchToApp will not
      // work.
      messagesApp.launch();

      // Switch to system app to be sure that notification is generated.
      client.switchToFrame();
      notificationList.waitForNotificationCount(1);

      notificationList.refresh();

      assert.equal(
        notificationList.getCount({
          manifestURL: messagesApp.manifestURL,
          title: smsMessage.sender,
          body: smsMessage.body
        }),
        1
      );
    });
  });

  suite('Flash message received', function() {
    var class0Message;

    setup(function() {
      class0Message = ThreadGenerator.generateSMS({
        threadId: 1,
        delivery: 'received',
        sender: '+123',
        body: 'Class-0 New Message',
        messageClass: 'class-0'
      });

      storage.setMessagesStorage([{
        id: class0Message.threadId,
        body: class0Message.body,
        lastMessageType: class0Message.type,
        timestamp: class0Message.timestamp,
        messages: [class0Message],
        participants: [class0Message.sender]
      }]);
    });

    test('Flash message is displayed correctly', function() {
      // Receive 'sms-received' system message and generate notification.
      messagesApp.sendSystemMessage('sms-received', class0Message);

      // We should make Messages app visible, otherwise switchToApp will not
      // work.
      messagesApp.launch();

      // Verify dialog content.
      var dialog = new DialogView(client);

      assert.equal(dialog.header, class0Message.sender);
      assert.equal(dialog.body, class0Message.body);

      // Dismiss dialog.
      dialog.chooseAction('OK');

      // Since Inbox should be ready by this moment and we know that there
      // shouldn't be any conversation, let's decrease search timeout,
      // otherwise we'll have to wait full timeout as Marionette will try to
      // find at least one conversation.
      var inbox = new InboxView(client.scope({ searchTimeout: 100 }));
      inbox.accessors.waitToAppear();

      assert.equal(inbox.conversations.length, 0);

      // We should not generate any notifications for class-0 messages, so
      // switch to system app to be sure that notification is not generated.
      client.switchToFrame();
      notificationList.refresh();

      assert.equal(
        notificationList.getCount({ manifestURL: messagesApp.manifestURL }), 0
      );
    });
  });
});
