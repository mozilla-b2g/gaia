'use strict';
/*global requireApp, suite, setup, testConfig, test, assert, suiteSetup,
         suiteTeardown */

requireApp('email/js/alameda.js');
requireApp('email/test/config.js');

suite('message_list', function() {
  var subject, MessageList;
  var mockMessagesSlice = { items: [], die: function() {} };
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
  var mockMessage = {
    author: { name: 'author' },
    subject: 'subject',
    snippet: 'this is a body snippet',
    date: Date.now(),
    sendStatus: {}
  };
  var mockMatches = { author: { text: 'auth', matchRuns: [] } };

  function testRefreshBtnAccessibility(syncing) {
    assert.equal(subject.refreshBtn.getAttribute('data-l10n-id'),
      syncing ? 'messages-refresh-progress' : 'messages-refresh-button');
    if (syncing) {
      assert.equal(subject.refreshBtn.getAttribute('role'), 'progressbar');
    } else {
      assert.isNull(subject.refreshBtn.getAttribute('role'));
    }
  }

  function testSelectedMessage(element, editMode, selected) {
    assert.equal(element.getAttribute('aria-selected'),
      editMode ? selected ? 'true' : 'false'  : null);
    assert.equal(element.querySelector('input[type=checkbox]').checked,
      editMode && selected);
  }

  function testMessageState(message, state) {
    message.sendStatus.state = state;
    subject.updateMessageDom(true, message);
    var syncingNode = message.element
                      .querySelector('.msg-header-syncing-section');
    if (state) {
      assert.equal(syncingNode.getAttribute('data-l10n-id'),
        'message-header-state-' + state);
    } else {
      assert.equal(true, !syncingNode.hasAttribute('data-l10n-id'));
    }
  }

  suiteSetup(function(done) {
    testConfig({
      suiteTeardown: suiteTeardown,
      done: done
    }, [
      'header_cursor',
      'element!cards/message_list',
      'tmpl!cards/msg/header_item.html'], function(hc, ml, hi) {
      mockMessage.element = hi.cloneNode(true);
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

  suite('setMessageChecked', function() {
    var element;
    setup(function() {
      element = Object.create(mockMessage).element;
    });

    test('set checked', function() {
      subject.setMessageChecked(element, true);
      testSelectedMessage(element, true, true);
    });

    test('set not checked', function() {
      subject.setMessageChecked(element, false);
      testSelectedMessage(element, true, false);
    });
  });

  suite('setSelectState', function() {
    var message, element;
    setup(function() {
      message = Object.create(mockMessage);
      element = message.element;
      subject.selectedMessages = [];
      subject.editMode = true;
    });

    test('not in edit mode', function() {
      subject.editMode = false;
      subject.setSelectState(element, message);
      testSelectedMessage(element, false);
    });

    test('set selected', function() {
      subject.selectedMessages.push(message);
      subject.setSelectState(element, message);
      testSelectedMessage(element, true, true);
    });

    test('set not selected', function() {
      subject.selectedMessages.pop(message);
      subject.setSelectState(element, message);
      testSelectedMessage(element, true, false);
    });
  });

  suite('_setEditMode', function() {
    var element;
    setup(function() {
      var message = Object.create(mockMessage);
      subject.updateMessageDom(true, message);
      element = message.element;
      assert.isNull(element.getAttribute('aria-selected'));
      subject.messagesContainer.appendChild(element);
    });

    test('in editMode', function() {
      subject._setEditMode(true);
      testSelectedMessage(element, true, false);
    });
  });

  suite('updateMessageDom', function() {
    var message, element;
    setup(function() {
      message = Object.create(mockMessage);
      element = message.element;
      subject.editMode = true;
      subject.selectedMessages = [];
    });

    test('not edit mode', function() {
      subject.editMode = false;
      subject.updateMessageDom(true, message);
      testSelectedMessage(element, false);
    });

    test('message selected', function() {
      subject.selectedMessages.push(message);
      subject.updateMessageDom(true, message);
      testSelectedMessage(element, true, true);
    });

    test('message not selected', function() {
      subject.selectedMessages.pop(message);
      subject.updateMessageDom(true, message);
      testSelectedMessage(element, true, false);
    });

    test('message has a sending state', function() {
      testMessageState(message, 'sending');
    });

    test('message has an error state', function() {
      testMessageState(message, 'error');
    });

    test('message has no state', function() {
      testMessageState(message);
    });
  });

  suite('updateMatchedMessageDom', function() {
    var message, element;
    setup(function() {
      message = Object.create(mockMessage);
      element = message.element;
      subject.editMode = true;
      subject.selectedMessages = [];
    });

    test('not edit mode', function() {
      subject.editMode = false;
      subject.updateMatchedMessageDom(true, {
        element: element,
        header: message,
        matches: mockMatches
      });
      testSelectedMessage(element, false);
    });

    test('message selected', function() {
      subject.selectedMessages.push(message);
      subject.updateMatchedMessageDom(true, {
        element: element,
        header: message,
        matches: mockMatches
      });
      testSelectedMessage(element, true, true);
    });

    test('message not selected', function() {
      subject.selectedMessages.pop(message);
      subject.updateMatchedMessageDom(true, {
        element: element,
        header: message,
        matches: mockMatches
      });
      testSelectedMessage(element, true, false);
    });
  });
});
