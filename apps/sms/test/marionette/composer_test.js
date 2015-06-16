/* global require, marionette, setup, suite, test, __dirname */
'use strict';

var assert = require('chai').assert;

var Messages = require('./lib/messages.js');
var InboxView = require('./lib/views/inbox/view');
var MessagesActivityCaller = require('./lib/messages_activity_caller.js');
var Storage = require('./lib/storage.js');

marionette('Messages Composer', function() {
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

  var messagesApp, activityCallerApp;

  function assertIsDisplayed(element) {
    assert.isTrue(element.displayed(), 'Element should be displayed');
  }

  function assertIsNotDisplayed(element) {
    assert.isFalse(element.displayed(), 'Element should not be displayed');
  }

  function assertIsFocused(element, message) {
    assert.isTrue(element.scriptWith(function(el) {
      return document.activeElement === el;
    }), message);
  }

  setup(function() {
    messagesApp = Messages.create(client);
    activityCallerApp = MessagesActivityCaller.create(client);

    client.contentScript.inject(
      __dirname + '/mocks/mock_navigator_moz_mobile_message.js'
    );
    client.contentScript.inject(
      __dirname + '/mocks/mock_navigator_moz_icc_manager.js'
    );
  });

  suite('Preserve message input while navigating', function() {
    var composer, inbox, conversation;
    var message = 'test message';

    function waitForInbox() {
      client.helper.waitForElement(inbox.mmsConversation);
    }

    function createMMSConversation() {
      inbox.navigateToComposer();
      messagesApp.addRecipient('a@b.c');
      messagesApp.addRecipient('s@p.c');
      composer.messageInput.sendKeys('MMS thread.');
      messagesApp.send();
    }

    setup(function() {
      conversation = messagesApp.Conversation;
      composer = messagesApp.Composer;
      inbox = messagesApp.Inbox;

      messagesApp.launch();
      createMMSConversation();
      messagesApp.performHeaderAction();
      waitForInbox();
      inbox.mmsConversation.tap();

      composer.messageInput.tap();
      composer.messageInput.sendKeys(message);
    });

    test('Message input is preserved when navigating to and from group-view',
    function() {
      conversation.headerTitle.tap();
      client.helper.waitForElement(messagesApp.Participants.main);
      messagesApp.performHeaderAction();
      assert.equal(composer.messageInput.text(), message);
    });

    test('Message input is preserved when navigating to and from ' +
    'message-report', function() {
      messagesApp.contextMenu(conversation.message);
      messagesApp.selectAppMenuOption('View message report');
      client.helper.waitForElement(messagesApp.Report.main);
      messagesApp.performHeaderAction();
      assert.equal(composer.messageInput.text(), message);
    });
  });

  suite('Messages Composer Test Suite', function() {
    var message = 'long long long long long message long long message long ' +
        'message long long message message long message long message long ' +
        'for message long message long message long message long message long';

    setup(function() {
      messagesApp.launch();
      messagesApp.Inbox.navigateToComposer();
    });

    test('Message char counter and MMS label', function() {
      var composer = messagesApp.Composer;

      // Case #1: When we open composer initially we should not see neither char
      // counter nor MMS label.
      assertIsNotDisplayed(composer.charCounter);
      assertIsNotDisplayed(composer.mmsLabel);

      // Case #2: Focus on message editor and enter some text. If we have more
      // than 20 chars left then we don't show available char counter yet
      composer.messageInput.tap();
      composer.messageInput.sendKeys(message.slice(0, 70));

      assertIsNotDisplayed(composer.charCounter);
      assertIsNotDisplayed(composer.mmsLabel);

      // Case #3: Enter some more text to see available char counter
      composer.messageInput.sendKeys(message.slice(0, 70));

      client.helper.waitForElement(composer.charCounter);
      assert.equal(composer.charCounter.text(), '20/1');
      assertIsNotDisplayed(composer.mmsLabel);

      // Case #4: Remove one character and char counter should disappear
      composer.messageInput.sendKeys(Messages.Chars.BACKSPACE);
      client.helper.waitForElementToDisappear(composer.charCounter);
      assertIsNotDisplayed(composer.mmsLabel);

      // Case #5: Add empty subject, if subject is empty then we still have SMS
      // and char counter can be displayed
      messagesApp.showSubject();

      assert.equal(composer.subjectInput.text(), '');
      assertIsNotDisplayed(composer.mmsLabel);
      assertIsNotDisplayed(composer.charCounter);

      // Case #6: Enter some text to message input to show available char
      // counter while subject is empty
      composer.messageInput.sendKeys('ab');

      client.helper.waitForElement(composer.charCounter);
      assert.equal(composer.charCounter.text(), '19/1');
      assertIsNotDisplayed(composer.mmsLabel);

      // Case #7: Enter some text to subject input. Message should be converted
      // to MMS and appropriate label should appear near subject field,
      // available char counter should disappear
      composer.subjectInput.sendKeys('subject');

      client.helper.waitForElement(composer.mmsLabel);
      client.helper.waitForElementToDisappear(composer.charCounter);

      // Case #8: Enter some text to message input while subject is not empty
      // and visible. In this case we still update available char counter, but
      // doesn't display it to the user as currently message is MMS
      composer.messageInput.sendKeys('cd');

      assertIsDisplayed(composer.mmsLabel);
      assertIsNotDisplayed(composer.charCounter);

      // Case #9: Remove subject when there is enough text to show available
      // char counter (with actual value), message converted to SMS
      messagesApp.hideSubject();

      client.helper.waitForElementToDisappear(composer.mmsLabel);
      client.helper.waitForElement(composer.charCounter);
      assert.equal(composer.charCounter.text(), '17/1');

      // Case #10: Add attachment, message is converted to MMS and appropriate
      // label appears in the subject line.
      messagesApp.addAttachment();

      activityCallerApp.switchTo();
      activityCallerApp.pickImage();

      messagesApp.switchTo();

      client.helper.waitForElement(composer.mmsLabel);
      client.helper.waitForElementToDisappear(composer.charCounter);
      // Since we have an attachment we don't track available characters and old
      // available char value should be removed to not confusing user
      assert.equal(composer.charCounter.text(), '');

      // Case #11: show subject when we have an attachment, message is still
      // MMS.
      messagesApp.showSubject();

      assertIsDisplayed(composer.mmsLabel);
      assertIsNotDisplayed(composer.charCounter);

      // Case #12: remove subject when we have an attachment, message is still
      // MMS
      messagesApp.hideSubject();

      assertIsDisplayed(composer.mmsLabel);
      assertIsNotDisplayed(composer.charCounter);

      // Case #13: edit some text and remove attachment, in this case message is
      // converted to SMS and we should show actual available char counter
      composer.messageInput.sendKeys('ef');

      composer.attachment.scriptWith(function(el) {
        el.scrollIntoView(false);
      });

      // Remove this workaround once Marionette bug is resolved:
      // "Bug 1046706 - "tap" does not find the element after scrolling in APZC"
      client.helper.wait(600);

      composer.attachment.tap();
      messagesApp.selectAppMenuOption('Remove image');

      client.helper.waitForElementToDisappear(composer.mmsLabel);
      client.helper.waitForElement(composer.charCounter);
      assert.equal(composer.charCounter.text(), '15/1');

      // Case #14: add an email recipient, the message is converted to MMS.
      messagesApp.addRecipient('a@b.com');
      assertIsDisplayed(composer.mmsLabel);

      // Case #15: remove the email recipient, the message is converted to SMS.
      messagesApp.getRecipient('a@b.com').tap();
      messagesApp.clearRecipient();
      client.helper.waitForElementToDisappear(composer.mmsLabel);
    });

    test('Subject focus management', function() {
      var composer = messagesApp.Composer;

      // Case #1: Add subject input, once added it should be focused
      messagesApp.showSubject();
      assertIsFocused(composer.subjectInput, 'Subject input should be focused');

      // Case #2: Hide subject field, focus should be moved to message field
      messagesApp.hideSubject();
      assertIsFocused(composer.messageInput, 'Message input should be focused');

      // Case #3: Focus should be moved to message input when subject is removed
      // by user with backspace key as well
      messagesApp.showSubject();
      assertIsFocused(composer.subjectInput, 'Subject input should be focused');

      composer.subjectInput.sendKeys(Messages.Chars.BACKSPACE);
      assertIsFocused(composer.messageInput, 'Message input should be focused');
    });
  });


  suite('Recipients', function() {
    var newMessage, storage;
    var contact = {
      name: ['Existing Contact'],
      givenName: ['Existing'],
      familyName: ['Contact'],
      tel: [{
        value: '5551234567',
        type: 'Mobile'
      }]
    };
    var MOCKS = [
      '/mocks/mock_test_storages.js',
      '/mocks/mock_navigator_moz_contacts.js'
    ];

    setup(function() {
      storage = Storage.create(client);

      MOCKS.forEach(function(mock) {
        client.contentScript.inject(__dirname + mock);
      });

      messagesApp.launch();
      storage.setMessagesStorage();
      storage.setContactsStorage([contact]);

      var inbox = new InboxView(client);
      newMessage = inbox.createNewMessage();
    });

    test('should match an existing contact', function() {
      newMessage.addNewRecipient('Existing Contact');
      assert.deepEqual(contact.name, newMessage.recipients);
      assert.equal(contact.tel[0].value, newMessage.recipientsPhoneNumbers);
    });

    suite('Invalid recipients', function() {
      suite('Recipients list', function() {
        test('should display that a non existing contact is invalid',
        function() {
          newMessage.addNewRecipient('non_exisiting_contact');
          assert.isTrue(newMessage.containsInvalidRecipients());
        });

        test('should allow to correct an invalid contact', function() {
          newMessage.addNewRecipient('non_exisiting_contact');
          newMessage.clearRecipients();
          newMessage.addNewRecipient(123);
          assert.lengthOf(newMessage.recipients, 1);
          assert.equal(newMessage.recipients[0], '123');
          assert.isFalse(newMessage.containsInvalidRecipients());
        });
      });

      suite('Content composer', function() {
        test('should not enable send button if the contact is invalid',
        function() {
          newMessage.addNewRecipient('invalidContact');
          newMessage.typeMessage('Test message');
          assert.isFalse(newMessage.isSendButtonEnabled());
        });
      });
    });

    suite('Semicolon as separator', function() {
      var separator = ';';

      test('should complete the entered recipients', function() {
        newMessage.addNewRecipient(123, separator);
        assert.lengthOf(newMessage.recipients, 1);
        assert.notInclude(newMessage.recipients[0], separator);
      });

      test('should leave the input ready to accept another recipient',
      function() {
        newMessage.addNewRecipient(123, separator);
        newMessage.addNewRecipient(456, separator);
        assert.lengthOf(newMessage.recipients, 2);
      });
    });
  });
});
