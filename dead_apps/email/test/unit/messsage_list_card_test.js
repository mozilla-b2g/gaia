'use strict';
/*global requireApp, suite, setup, testConfig, test, assert, suiteSetup,
         suiteTeardown */

requireApp('email/js/alameda.js');
requireApp('email/test/config.js');

suite('message_list', function() {
  var subject, modelCreate, HeaderCursor, MessageList;
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
    subject.updateMessageDom(message);
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
      'model_create',
      'header_cursor',
      'element!cards/message_list',
      'tmpl!cards/msg/header_item.html'], function(mc, hc, ml, hi) {
      modelCreate = mc;
      HeaderCursor = hc;
      mockMessage.element = hi.cloneNode(true);
      MessageList = ml;
    });
  });

  setup(function() {
    var headerCursor = new HeaderCursor(modelCreate.defaultModel);
    headerCursor.messagesSlice = mockMessagesSlice;
    subject = new MessageList();
    subject.onArgs({
      model: modelCreate.defaultModel,
      headerCursor: headerCursor
    });
  });

  suite('messages_status', function() {
    setup(function() {
      subject.curFolder = { type: 'inbox' };
    });

    test('synchronizing', function() {
      testRefreshBtnAccessibility(false);
      subject.msgVScroll.messages_status('synchronizing');
      testRefreshBtnAccessibility(true);
    });

    test('synced', function() {
      testRefreshBtnAccessibility(false);
      subject.msgVScroll.messages_status('synced');
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

  suite('updateDomEditControls', function() {
    test('no selected messages', function() {
      subject.selectedMessages = [];
      subject.updateDomEditControls();
      assert.equal(subject.editToolbar.starBtn.getAttribute('data-l10n-id'),
        'message-star-button');
      assert.equal(subject.editToolbar.readBtn.getAttribute('data-l10n-id'),
        'message-mark-read-button');
    });

    test('one read message', function() {
      subject.selectedMessages = [Object.create(mockReadMessage)];
      subject.updateDomEditControls();
      assert.equal(subject.editToolbar.starBtn.getAttribute('data-l10n-id'),
        'message-star-button');
      assert.equal(subject.editToolbar.readBtn.getAttribute('data-l10n-id'),
        'message-mark-unread-button');
    });

    test('one starred message', function() {
      subject.selectedMessages = [Object.create(mockStarredMessage)];
      subject.updateDomEditControls();
      assert.equal(subject.editToolbar.starBtn.getAttribute('data-l10n-id'),
        'message-unstar-button');
      assert.equal(subject.editToolbar.readBtn.getAttribute('data-l10n-id'),
        'message-mark-read-button');
    });

    test('one read and starred message', function() {
      subject.selectedMessages = [Object.create(mockStarredReadMessage)];
      subject.updateDomEditControls();
      assert.equal(subject.editToolbar.starBtn.getAttribute('data-l10n-id'),
        'message-unstar-button');
      assert.equal(subject.editToolbar.readBtn.getAttribute('data-l10n-id'),
        'message-mark-unread-button');
    });

    test('one read and one unread message', function() {
      subject.selectedMessages = [Object.create(mockReadMessage),
        Object.create(mockMessage)];
      subject.updateDomEditControls();
      assert.equal(subject.editToolbar.starBtn.getAttribute('data-l10n-id'),
        'message-star-button');
      assert.equal(subject.editToolbar.readBtn.getAttribute('data-l10n-id'),
        'message-mark-unread-button');
    });

    test('one starred and one unstarred message', function() {
      subject.selectedMessages = [Object.create(mockStarredMessage),
        Object.create(mockMessage)];
      subject.updateDomEditControls();
      assert.equal(subject.editToolbar.starBtn.getAttribute('data-l10n-id'),
        'message-star-button');
      assert.equal(subject.editToolbar.readBtn.getAttribute('data-l10n-id'),
        'message-mark-read-button');
    });
  });

  suite('updateDomMessageChecked', function() {
    var element;
    setup(function() {
      element = Object.create(mockMessage).element;
    });

    test('set checked', function() {
      subject.updateDomMessageChecked(element, true);
      testSelectedMessage(element, true, true);
    });

    test('set not checked', function() {
      subject.updateDomMessageChecked(element, false);
      testSelectedMessage(element, true, false);
    });
  });

  suite('updateDomSelectState', function() {
    var message, element;
    setup(function() {
      message = Object.create(mockMessage);
      element = message.element;
      subject.selectedMessages = [];
      subject.editMode = true;
    });

    test('not in edit mode', function() {
      subject.editMode = false;
      subject.updateDomSelectState(element, message);
      testSelectedMessage(element, false);
    });

    test('set selected', function() {
      subject.selectedMessages.push(message);
      subject.updateDomSelectState(element, message);
      testSelectedMessage(element, true, true);
    });

    test('set not selected', function() {
      subject.selectedMessages.pop(message);
      subject.updateDomSelectState(element, message);
      testSelectedMessage(element, true, false);
    });
  });

  suite('_setEditMode', function() {
    var element;
    setup(function() {
      var message = Object.create(mockMessage);
      subject.updateMessageDom(message);
      element = message.element;
      assert.isNull(element.getAttribute('aria-selected'));
      subject.msgVScroll.appendChild(element);
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
      subject.updateMessageDom(message);
      testSelectedMessage(element, false);
    });

    test('message selected', function() {
      subject.selectedMessages.push(message);
      subject.updateMessageDom(message);
      testSelectedMessage(element, true, true);
    });

    test('message not selected', function() {
      subject.selectedMessages.pop(message);
      subject.updateMessageDom(message);
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
});
