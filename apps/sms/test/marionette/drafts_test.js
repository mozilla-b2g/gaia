/* global require, marionette, setup, suite, test, __dirname */
'use strict';

var assert = require('chai').assert;

var MessagesActivityCaller = require('./lib/messages_activity_caller.js');
var ThreadGenerator = require('./generators/thread');
var Messages = require('./lib/messages.js');
var Storage = require('./lib/storage.js');
var InboxView = require('./lib/views/inbox/view');

marionette('Messages Drafts', function() {
  var apps = {};

  apps[MessagesActivityCaller.ORIGIN] = __dirname + '/apps/activitycaller';

  var client = marionette.client({
    profile: {
      prefs: {
        'focusmanager.testmode': true
      },

      apps: apps
    },
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });

  var messagesApp, storage;

  function createAndSaveDraft(view, draft) {
    // Add text content.
    if (draft.text) {
      view.typeMessage(draft.text);
    }

    // Add subject.
    if (draft.subject) {
      view.showSubject();
      view.typeSubject(draft.subject);
    }

    // Add recipient.
    if (draft.recipients) {
      draft.recipients.forEach(function(recipient) {
        view.addNewRecipient(recipient);
      });
    }

    // Add attachment.
    if (draft.shouldHaveAttachment) {
      view.addAttachment().choose('Messages Activity Caller').pickImage();
      messagesApp.switchTo();
    }

    var inboxView = view.backToInbox();

    // It's important to wait for the updated thread node (when old node is
    // removed, and new one is inserted), otherwise we can get old node
    // reference and when we try to tap on it, we'll get stale element
    // reference exception if node has been removed in between.
    var conversationWithDraft = null;
    client.waitFor(function() {
      var conversations = inboxView.conversations;

      if (!conversations.length) {
        return false;
      }

      conversationWithDraft = conversations[0];

      if (!conversationWithDraft.isDraft && !conversationWithDraft.hasDraft) {
        return false;
      }

      var expectedBodyText = (draft.subject || draft.shouldHaveAttachment) ?
        '' : draft.text;

      return conversationWithDraft.bodyText === expectedBodyText;
    });

    return conversationWithDraft;
  }

  function discardDraft(view, draft) {
    if (draft.text || draft.shouldHaveAttachment) {
      view.clearMessage();
    }

    if (draft.subject) {
      view.hideSubject();
    }

    if (draft.recipients) {
      view.clearRecipients();
    }

    view.backToInbox();
  }

  function assertDraft(view, draft) {
    // Check that recipient is loaded from draft.
    if (draft.recipients) {
      var recipients = view.recipients;
      assert.equal(recipients.length, draft.recipients.length);

      draft.recipients.forEach(function(recipient, index) {
        assert.equal(recipients[index], recipient);
      });
    }

    // Check that text content is loaded.
    if (draft.text) {
      assert.equal(view.messageText, draft.text);
    }

    // Check that subject is loaded.
    if (draft.subject) {
      assert.isTrue(view.isSubjectVisible());
      assert.equal(view.subject, draft.subject);
    } else {
      assert.isFalse(view.isSubjectVisible());
    }

    // Check that attachment is loaded.
    if (draft.shouldHaveAttachment) {
      assert.equal(view.attachments.length, 1);
    }

    view.assertMessageInputFocused('Message input should be focused');
  }

  setup(function() {
    messagesApp = Messages.create(client);
    storage = Storage.create(client);

    client.loader.getMockManager('sms').inject([
      'test_storages',
      'test_blobs',
      'navigator_moz_mobile_message'
    ]);
  });

  suite('Messages Drafts Test Suite', function() {
    var conversation, draft, draftWithoutRecipient, inboxView;

    function assertDraftIsDiscarded() {
      // Check that draft is discarded and removed from inbox view.
      var originalConversation = null;
      client.waitFor(function() {
        var conversations = inboxView.conversations;

        // In discard draft case we expect exactly one conversation in inbox.
        if (conversations.length !== 1) {
          return false;
        }

        originalConversation = conversations[0];

        return !originalConversation.isDraft && !originalConversation.hasDraft;
      });

      assert.deepEqual(originalConversation, {
        id: conversation.id,
        title: conversation.participants[0],
        bodyText: conversation.body,
        lastMessageType: 'sms',
        isDraft: false,
        hasDraft: false
      });
    }

    function relaunchApp() {
      messagesApp.close();
      messagesApp.launch();
    }

    setup(function() {
      conversation = ThreadGenerator.generate();

      draft = {
        text: 'some message',
        subject: 'some subject',
        recipients: ['+123'],
        shouldHaveAttachment: true
      };

      draftWithoutRecipient = {
        text: 'some message',
        subject: 'some subject',
        shouldHaveAttachment: true
      };

      storage.setMessagesStorage(
        [conversation], ThreadGenerator.uniqueMessageId
      );

      messagesApp.launch();

      inboxView = new InboxView(client);
    });

    suite('Conversation-less drafts', function() {
      var newMessageView, originalDraftConversation;

      setup(function() {
        newMessageView = inboxView.createNewMessage();
        originalDraftConversation = createAndSaveDraft(newMessageView, draft);

        assert.deepEqual(originalDraftConversation, {
          // We don't know draft id in advance, but we need every field for the
          // assert.deepEqual to work.
          id: originalDraftConversation.id,
          isDraft: true,
          hasDraft: true,
          lastMessageType: 'mms',
          title: draft.recipients[0],
          bodyText: ''
        });

        inboxView.goToConversation(originalDraftConversation.id);
        assertDraft(newMessageView, draft);
      });

      test('Draft is correctly saved', function() {
        // Relaunch application and verify draft is persisted.
        relaunchApp();

        assert.deepEqual(
          inboxView.conversations[0], originalDraftConversation
        );

        inboxView.goToConversation(originalDraftConversation.id);
        assertDraft(newMessageView, draft);
      });

      test('Draft is correctly modified', function() {
        var newDraft = {
          text: 'content_changed',
          recipients: ['+234']
        };

        newMessageView.clearRecipients();
        newMessageView.clearMessage();
        newMessageView.hideSubject();

        var updatedDraftConversation = createAndSaveDraft(
          newMessageView, newDraft
        );

        assert.deepEqual(updatedDraftConversation, {
          id: originalDraftConversation.id,
          isDraft: true,
          hasDraft: true,
          lastMessageType: 'sms',
          title: newDraft.recipients[0],
          bodyText: newDraft.text
        });

        inboxView.goToConversation(updatedDraftConversation.id);
        assertDraft(newMessageView, newDraft);

        // Relaunch application and verify draft is persisted.
        relaunchApp();

        assert.deepEqual(
          inboxView.conversations[0], updatedDraftConversation
        );

        inboxView.goToConversation(updatedDraftConversation.id);
        assertDraft(newMessageView, newDraft);
      });

      test('Draft is correctly discarded', function() {
        discardDraft(newMessageView, draft);

        assertDraftIsDiscarded();

        // Relaunch application and verify draft is persistently discarded.
        relaunchApp();

        assertDraftIsDiscarded();
      });
    });

    suite('Conversation-less recipient-less drafts', function() {
      var newMessageView, originalDraftConversation;

      test('Recipient field is focused when draft has no recipients',
      function() {
        newMessageView = inboxView.createNewMessage();
        originalDraftConversation = createAndSaveDraft(newMessageView,
                                                       draftWithoutRecipient);

        assert.deepEqual(originalDraftConversation, {
          // We don't know draft id in advance, but we need every field for the
          // assert.deepEqual to work.
          id: originalDraftConversation.id,
          isDraft: true,
          hasDraft: true,
          lastMessageType: 'mms',
          title: '(No recipient)',
          bodyText: ''
        });

        inboxView.goToConversation(originalDraftConversation.id);
        newMessageView.assertRecipientsInputFocused(
          'Message input should be focused'
        );
      });
    });

    suite('Conversation drafts', function() {
      var conversationView, originalConversationWithDraft;

      setup(function() {
        // Conversation draft can't contain any recipients.
        delete draft.recipients;

        conversationView = inboxView.goToConversation(conversation.id);
        originalConversationWithDraft = createAndSaveDraft(
          conversationView, draft
        );

        assert.deepEqual(originalConversationWithDraft, {
          id: conversation.id,
          lastMessageType: 'mms',
          title: conversation.participants[0],
          bodyText: '',
          isDraft: false,
          hasDraft: true
        });

        inboxView.goToConversation(originalConversationWithDraft.id);
        assertDraft(conversationView, draft);
      });

      test('Conversation draft is correctly saved', function() {
        // Relaunch application and verify draft is persisted.
        relaunchApp();

        assert.deepEqual(
          inboxView.conversations[0], originalConversationWithDraft
        );

        inboxView.goToConversation(originalConversationWithDraft.id);
        assertDraft(conversationView, draft);
      });

      test('Conversation Draft is correctly modified', function() {
        var newDraft = {
          text: 'content_changed'
        };

        conversationView.clearMessage();
        conversationView.hideSubject();

        var updatedConversationWithDraft = createAndSaveDraft(
          conversationView, newDraft
        );

        assert.deepEqual(updatedConversationWithDraft, {
          id: originalConversationWithDraft.id,
          lastMessageType: 'sms',
          title: originalConversationWithDraft.title,
          bodyText: newDraft.text,
          isDraft: false,
          hasDraft: true
        });

        inboxView.goToConversation(updatedConversationWithDraft.id);
        assertDraft(conversationView, newDraft);

        // Relaunch application and verify draft is persisted.
        relaunchApp();

        assert.deepEqual(
          inboxView.conversations[0], updatedConversationWithDraft
        );

        inboxView.goToConversation(updatedConversationWithDraft.id);
        assertDraft(conversationView, newDraft);
      });

      test('Conversation Draft is correctly discarded', function() {
        discardDraft(conversationView, draft);

        assertDraftIsDiscarded();

        // Relaunch application and verify draft is persisted.
        relaunchApp();

        assertDraftIsDiscarded();
      });

      test('Conversation Draft is correctly converted to conversation-less one',
      function() {
        conversationView.deleteMessage(conversation.messages[0].id);

        var newDraftConversation = null;
        client.waitFor(function() {
          var conversations = inboxView.conversations;

          if (conversations.length !== 1) {
            return false;
          }

          newDraftConversation = conversations[0];

          return newDraftConversation.isDraft;
        });

        assert.deepEqual(newDraftConversation, {
          // We don't know draft id in advance, but we need every field for the
          // assert.deepEqual to work.
          id: newDraftConversation.id,
          lastMessageType: 'mms',
          title: originalConversationWithDraft.title,
          bodyText: originalConversationWithDraft.bodyText,
          isDraft: true,
          hasDraft: true
        });

        // New draft should contain recipients from the removed conversation.
        var newDraft = {
          text: draft.text,
          subject: draft.subject,
          recipients: conversation.participants,
          shouldHaveAttachment: draft.shouldHaveAttachment
        };

        var newMessageView = inboxView.goToConversation(
          newDraftConversation.id
        );
        assertDraft(newMessageView, newDraft);

        // Relaunch application and verify draft is persisted.
        relaunchApp();

        assert.deepEqual(inboxView.conversations[0], newDraftConversation);

        inboxView.goToConversation(newDraftConversation.id);
        assertDraft(newMessageView, newDraft);
      });
    });
  });
});
