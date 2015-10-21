/* global require, marionette, setup, suite, test, __dirname */
'use strict';

var assert = require('chai').assert;

var Messages = require('./lib/messages.js');
var MessagesActivityCaller = require('./lib/messages_activity_caller.js');
var Storage = require('./lib/storage.js');

marionette('Messages as "new" activity target', function() {
  var MOCKS = [
    '/mocks/mock_test_storages.js',
    '/mocks/mock_navigator_moz_icc_manager.js',
    '/mocks/mock_navigator_moz_mobile_message.js',
    '/mocks/mock_navigator_moz_contacts.js'
  ];

  var apps = {};

  apps[MessagesActivityCaller.ORIGIN] = __dirname + '/apps/activitycaller';

  var client = marionette.client({
    profile: {
      apps: apps
    }
  });

  var messagesApp, activityCallerApp, storage;

  function launchAsActivity(activityData) {
    var smsMessage = {
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

    activityCallerApp.sendMessage(activityData);
    messagesApp.switchTo();

    storage.setMessagesStorage([{
      id: smsMessage.threadId,
      body: smsMessage.body,
      lastMessageType: smsMessage.type,
      timestamp: smsMessage.timestamp,
      messages: [smsMessage],
      participants: [smsMessage.receiver]
    }]);

    storage.setContactsStorage([{
      name: ['Alan Turing'],
      tel: [{
        value: '+100',
        type: 'Mobile'
      }]
    }]);
  }

  function assertIsFocused(element, message) {
    assert.isTrue(element.scriptWith(function(el) {
      return document.activeElement === el;
    }), message);
  }

  setup(function() {
    messagesApp = Messages.create(client);
    activityCallerApp = MessagesActivityCaller.create(client);
    storage = Storage.create(client);

    MOCKS.forEach(function(mock) {
      client.contentScript.inject(__dirname + mock);
    });
  });

  suite('Send new message', function() {
    var content = 'Let\'s rock - http://mozilla.org!';
    var number = '+123456';

    setup(function() {
      activityCallerApp.launch();
    });

    test('Activity with malicious content', function() {
      var maliciousContent =
        content + '<img src="/" onerror="delete window.Compose;" />';

      launchAsActivity({ number: number, body: maliciousContent });

      // Wait until message input is filled with the content
      client.scope({ searchTimeout: 100 }).waitFor(function() {
        return messagesApp.Composer.messageInput.text() === maliciousContent;
      });

      // Verify that xss wasn't successful for composer case
      assert.isTrue(client.executeScript(function() {
        return !!window.wrappedJSObject.Compose;
      }), 'XSS should not be performed');

      assert.isTrue(messagesApp.Composer.sendButton.enabled());

      assert.equal(
        messagesApp.Composer.header.getAttribute('action'), 'close',
        'Close activity button should be visible'
      );

      messagesApp.send();

      // Verify that everything is fine with rendered message content
      var message = messagesApp.Conversation.message;
      assert.equal(
        messagesApp.Conversation.getMessageContent(message).text(),
        maliciousContent
      );

      // Validate that header is correctly set even that thread list hasn't
      // been loaded yet.
      assert.equal(messagesApp.Conversation.headerTitle.text(), number);

      assert.equal(
        messagesApp.Composer.header.getAttribute('action'), 'close',
        'Close activity button should be visible'
      );

      // Verify that xss wasn't successful for thread case
      assert.isTrue(client.executeScript(function() {
        return !!window.wrappedJSObject.Compose;
      }), 'XSS should not be performed');
    });

    test('Activity with "body" only', function() {
      launchAsActivity({ body: content });

      // Wait until message input is filled with the content
      client.scope({ searchTimeout: 100 }).waitFor(function() {
        return messagesApp.Composer.messageInput.text() === content;
      });

      assert.isFalse(messagesApp.Composer.sendButton.enabled());
      assert.equal(messagesApp.Composer.recipients.length, 0);

      assert.equal(
        messagesApp.Composer.header.getAttribute('action'), 'close',
        'Close activity button should be visible'
      );

      assertIsFocused(
        messagesApp.Composer.recipientsInput,
        'Recipient input should be focused'
      );
    });

    test('Activity with "body" and unknown "number"', function() {
      launchAsActivity({ number: number, body: content });

      // Wait until message input is filled with the content
      client.scope({ searchTimeout: 100 }).waitFor(function() {
        return messagesApp.Composer.messageInput.text() === content;
      });

      var recipients = messagesApp.Composer.recipients;
      assert.equal(recipients.length, 1);
      assert.equal(recipients[0].text(), number);
      assert.equal(recipients[0].getAttribute('data-source'), 'manual');

      assert.isTrue(messagesApp.Composer.sendButton.enabled());

      assert.equal(
        messagesApp.Composer.header.getAttribute('action'), 'close',
        'Close activity button should be visible'
      );

      assertIsFocused(
        messagesApp.Composer.messageInput, 'Message input should be focused'
      );
    });

    test('Activity with "body" and contact "number"', function() {
      // Send message to number that has contact associated with it
      launchAsActivity({ number: '+100', body: content });

      // Wait until message input is filled with the content
      client.scope({ searchTimeout: 100 }).waitFor(function() {
        return messagesApp.Composer.messageInput.text() === content;
      });

      var recipients = messagesApp.Composer.recipients;
      assert.equal(recipients.length, 1);
      assert.equal(recipients[0].text(), 'Alan Turing');
      assert.equal(recipients[0].getAttribute('data-source'), 'contacts');

      assert.isTrue(messagesApp.Composer.sendButton.enabled());

      assert.equal(
        messagesApp.Composer.header.getAttribute('action'), 'close',
        'Close activity button should be visible'
      );

      assertIsFocused(
        messagesApp.Composer.messageInput, 'Message input should be focused'
      );
    });

    test('Activity with thread "number"', function() {
      // Send message to number that has thread associated with it
      launchAsActivity({ number: '+200' });

      // Verify that we entered the right thread
      var message = messagesApp.Conversation.message;
      assert.equal(
        messagesApp.Conversation.getMessageContent(message).text(),
        'Workload message'
      );

      assert.isFalse(messagesApp.Composer.sendButton.enabled());

      assert.equal(
        messagesApp.Composer.header.getAttribute('action'), 'close',
        'Close activity button should be visible'
      );

      // Validate that header is correctly set even that thread list hasn't
      // been loaded yet.
      assert.equal(messagesApp.Conversation.headerTitle.text(), '+200');

      assertIsFocused(
        messagesApp.Composer.messageInput, 'Message input should be focused'
      );
    });

    test('Activity with thread "number" and "body"', function() {
      // Send message to number that has thread associated with it
      launchAsActivity({ number: '+200', body: content });

      // Wait until message input is filled with the content
      client.scope({ searchTimeout: 100 }).waitFor(function() {
        return messagesApp.Composer.messageInput.text() === content;
      });

      var recipients = messagesApp.Composer.recipients;
      assert.equal(recipients.length, 1);
      assert.equal(recipients[0].text(), '+200');
      assert.equal(recipients[0].getAttribute('data-source'), 'manual');

      assert.isTrue(messagesApp.Composer.sendButton.enabled());

      assert.equal(
        messagesApp.Composer.header.getAttribute('action'), 'close',
        'Close activity button should be visible'
      );

      assertIsFocused(
        messagesApp.Composer.messageInput, 'Message input should be focused'
      );
    });
  });
});
