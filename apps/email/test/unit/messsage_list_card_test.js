'use strict';
/*global requireApp, suite, setup, testConfig, test, assert, suiteSetup,
         suiteTeardown */

requireApp('email/js/alameda.js');
requireApp('email/test/config.js');

suite('message_list', function() {
  var subject, MessageList;
  var mockMessagesSlice = { items: [] };

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
});
