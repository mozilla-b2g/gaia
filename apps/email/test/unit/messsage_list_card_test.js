'use strict';
/*global requireApp, suite, setup, testConfig, test, assert, suiteSetup,
         suiteTeardown */

requireApp('email/js/alameda.js');
requireApp('email/test/config.js');

suite('message_list', function() {
  var subject, MessageList;
  var mockMessagesSlice = { items: [] };
  var mockStarredMessage = {
    isStarred: true
  };
  var mockReadMessage = {
    isRead: true
  };
  var mockStarredReadMessage = {
    isStarred: true,
    isRead: true
  };
  var mockMessage = {};

  function testRefreshBtnAccessibility(syncing) {
    assert.equal(subject.refreshBtn.getAttribute('data-l10n-id'),
      syncing ? 'messages-refresh-progress' : 'messages-refresh-button');
    if (syncing) {
      assert.equal(subject.refreshBtn.getAttribute('role'), 'progressbar');
    } else {
      assert.isNull(subject.refreshBtn.getAttribute('role'));
    }
  }

  suiteSetup(function(done) {
    testConfig({
      suiteTeardown: suiteTeardown,
      done: done
    }, ['header_cursor', 'element!cards/message_list'], function(hc, ml) {
      hc.cursor.messagesSlice = mockMessagesSlice;
      MessageList = ml;
    });
  });

  setup(function() {
    subject = new MessageList();
  });

  suite('messages_status', function() {
    setup(function() {
      subject.curFolder = { type: 'inbox' };
    });

    test('synchronizing', function() {
      testRefreshBtnAccessibility(false);
      subject.messages_status('synchronizing');
      testRefreshBtnAccessibility(true);
    });

    test('synced', function() {
      testRefreshBtnAccessibility(false);
      subject.messages_status('synced');
      testRefreshBtnAccessibility(false);
    });
  });

  suite('toggleOutboxSyncingDisplay', function() {
    setup(function() {
      subject.curFolder = { type: 'outbox' };
    });

    test('syncing', function() {
      testRefreshBtnAccessibility(false);
      subject.toggleOutboxSyncingDisplay(true);
      testRefreshBtnAccessibility(true);
    });

    test('not syncing', function() {
      setup(function() {
        subject._outboxSyncing = true;
      });

      testRefreshBtnAccessibility(false);
      subject.toggleOutboxSyncingDisplay(false);
      testRefreshBtnAccessibility(false);
    });
  });

  suite('selectedMessagesUpdated', function() {
    test('no selected messages', function() {
      subject.selectedMessages = [];
      subject.selectedMessagesUpdated();
      assert.equal(subject.starBtn.getAttribute('data-l10n-id'),
        'message-star-button');
      assert.equal(subject.readBtn.getAttribute('data-l10n-id'),
        'message-mark-read-button');
    });

    test('one read message', function() {
      subject.selectedMessages = [Object.create(mockReadMessage)];
      subject.selectedMessagesUpdated();
      assert.equal(subject.starBtn.getAttribute('data-l10n-id'),
        'message-star-button');
      assert.equal(subject.readBtn.getAttribute('data-l10n-id'),
        'message-mark-unread-button');
    });

    test('one starred message', function() {
      subject.selectedMessages = [Object.create(mockStarredMessage)];
      subject.selectedMessagesUpdated();
      assert.equal(subject.starBtn.getAttribute('data-l10n-id'),
        'message-unstar-button');
      assert.equal(subject.readBtn.getAttribute('data-l10n-id'),
        'message-mark-read-button');
    });

    test('one read and starred message', function() {
      subject.selectedMessages = [Object.create(mockStarredReadMessage)];
      subject.selectedMessagesUpdated();
      assert.equal(subject.starBtn.getAttribute('data-l10n-id'),
        'message-unstar-button');
      assert.equal(subject.readBtn.getAttribute('data-l10n-id'),
        'message-mark-unread-button');
    });

    test('one read and one unread message', function() {
      subject.selectedMessages = [Object.create(mockReadMessage),
        Object.create(mockMessage)];
      subject.selectedMessagesUpdated();
      assert.equal(subject.starBtn.getAttribute('data-l10n-id'),
        'message-star-button');
      assert.equal(subject.readBtn.getAttribute('data-l10n-id'),
        'message-mark-unread-button');
    });

    test('one starred and one unstarred message', function() {
      subject.selectedMessages = [Object.create(mockStarredMessage),
        Object.create(mockMessage)];
      subject.selectedMessagesUpdated();
      assert.equal(subject.starBtn.getAttribute('data-l10n-id'),
        'message-star-button');
      assert.equal(subject.readBtn.getAttribute('data-l10n-id'),
        'message-mark-read-button');
    });
  });
});
