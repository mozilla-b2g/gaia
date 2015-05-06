/*global MocksHelper, loadBodyHTML, MockL10n, InboxView,
         MessageManager, WaitingScreen, Threads, Template, MockMessages,
         MockThreadList, MockTimeHeaders, Draft, Drafts, Thread,
         ConversationView,
         MockOptionMenu, Utils, Contacts, MockContact, Navigation,
         MockSettings, Settings,
         InterInstanceEventDispatcher,
         MockStickyHeader,
         StickyHeader
         */

'use strict';

requireApp('sms/js/utils.js');
require('/views/conversation/js/recipients.js');
requireApp('sms/js/drafts.js');
requireApp('sms/js/threads.js');
require('/views/inbox/js/inbox.js');

require('/shared/test/unit/mocks/mock_async_storage.js');
require('/shared/test/unit/mocks/mock_l10n.js');
requireApp('sms/test/unit/mock_contact.js');
requireApp('sms/test/unit/mock_contacts.js');
requireApp('sms/test/unit/mock_time_headers.js');
requireApp('sms/test/unit/mock_message_manager.js');
requireApp('sms/test/unit/mock_messages.js');
requireApp('sms/test/unit/mock_utils.js');
requireApp('sms/test/unit/mock_waiting_screen.js');
require('/shared/test/unit/mocks/mock_contact_photo_helper.js');
require('/test/unit/thread_list_mockup.js');
require('/test/unit/utils_mockup.js');
require('/test/unit/mock_conversation.js');
require('/shared/test/unit/mocks/mock_option_menu.js');
require('/shared/test/unit/mocks/mock_sticky_header.js');
require('/test/unit/mock_navigation.js');
require('/test/unit/mock_settings.js');
require('/test/unit/mock_inter_instance_event_dispatcher.js');
require('/test/unit/mock_selection_handler.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');

var mocksHelperForInboxView = new MocksHelper([
  'asyncStorage',
  'Contacts',
  'MessageManager',
  'Utils',
  'WaitingScreen',
  'TimeHeaders',
  'ConversationView',
  'ContactPhotoHelper',
  'OptionMenu',
  'StickyHeader',
  'Navigation',
  'InterInstanceEventDispatcher',
  'SelectionHandler',
  'LazyLoader',
  'Settings'
]).init();

suite('thread_list_ui', function() {
  var nativeMozL10n = navigator.mozL10n;
  var draftSavedBanner;
  var mainWrapper;

  mocksHelperForInboxView.attachTestHelpers();
  setup(function() {
    loadBodyHTML('/index.html');
    navigator.mozL10n = MockL10n;
    draftSavedBanner = document.getElementById('threads-draft-saved-banner');
    mainWrapper = document.getElementById('main-wrapper');

    this.sinon.stub(MessageManager, 'on');
    this.sinon.stub(InterInstanceEventDispatcher, 'on');

    InboxView.readyDeferred = Utils.Promise.defer();
    InboxView.init();

    // Clear drafts as leftovers in the profile might break the tests
    Drafts.clear();
  });

  teardown(function() {
    navigator.mozL10n = nativeMozL10n;
    document.body.textContent = '';
  });

  function insertMockMarkup(someDate) {
    someDate = +someDate;
    var markup =
      '<header></header>' +
      '<ul id="threadsContainer_' + someDate + '">';

    for (var i = 1; i < 3; i++) {
      markup +=
        '<li id="thread-' + i + '" class="threadlist-item" ' +
            'data-time="' + someDate + '" ' +
            'data-thread-id="' + i + '">' +
          '<label>' +
            '<input type="checkbox" data-mode="threads" value="' + i + '"/>' +
          '</label>' +
          '<a href="#thread=' + i + '"</a>' +
        '</li>';
    }

    markup += '</ul>';

    InboxView.container.innerHTML = markup;
  }

  suite('delayed rendering loops', function() {

    suite('multiple render calls', function() {
      var appendThread;
      var appendCallCount;

      suiteSetup(function() {
        appendThread = InboxView.appendThread;
        InboxView.appendThread = function(thread) {
          appendCallCount++;
          assert.ok(thread.okay);
        };
      });

      suiteTeardown(function() {
        InboxView.appendThread = appendThread;
      });

      setup(function() {
        appendCallCount = 0;
      });

    });

  });

  suite('setEmpty', function() {
    suite('(true)', function() {
      var panel;
      setup(function() {
        panel = document.getElementById('thread-list');
        InboxView.setEmpty(true);
      });
      test('displays noMessages and hides container', function() {
        assert.isTrue(panel.classList.contains('threadlist-is-empty'));
      });
    });
    suite('(false)', function() {
      var panel;
      setup(function() {
        panel = document.getElementById('thread-list');
        InboxView.setEmpty(false);
      });
      test('hides noMessages and displays container', function() {
        assert.isFalse(panel.classList.contains('threadlist-is-empty'));
      });
    });
  });

  suite('showOptions', function() {
    setup(function() {
      MockOptionMenu.mSetup();
    });
    teardown(function() {
      MockOptionMenu.mTeardown();
    });

    test('show select/settings/cancel options when list existed', function() {
      InboxView.setEmpty(false);
      InboxView.showOptions();

      var optionItems = MockOptionMenu.calls[0].items;
      assert.equal(optionItems.length, 3);
      assert.equal(optionItems[0].l10nId, 'selectThreads-label');
      assert.equal(optionItems[1].l10nId, 'settings');
      assert.equal(optionItems[2].l10nId, 'cancel');
    });
  });

  suite('removeThread', function() {
    setup(function() {
      InboxView.container.innerHTML = '<h2 id="header-1"></h2>' +
        '<ul id="list-1"><li id="thread-1"></li>' +
        '<li id="thread-2" data-photo-url="blob"></li></ul>' +
        '<h2 id="header-2"></h2>' +
        '<ul id="list-2"><li id="thread-3"></li></ul>';

      InboxView.sticky = new MockStickyHeader();
      this.sinon.stub(InboxView.sticky, 'refresh');
      this.sinon.stub(window.URL, 'revokeObjectURL');
    });

    suite('remove last thread in header', function() {
      setup(function() {
        InboxView.removeThread(3);
      });
      test('no need to revoke if photoUrl not exist', function() {
        sinon.assert.notCalled(window.URL.revokeObjectURL);
      });
      test('calls StickyHeader.refresh', function() {
        sinon.assert.called(InboxView.sticky.refresh);
      });
      test('leaves other threads alone', function() {
        assert.ok(InboxView.container.querySelector('#thread-1'));
        assert.ok(InboxView.container.querySelector('#thread-2'));
      });
      test('removes threads', function() {
        assert.ok(!InboxView.container.querySelector('#thread-3'));
      });
      test('removes empty header', function() {
        assert.ok(!InboxView.container.querySelector('#header-2'));
      });
      test('removes empty list', function() {
        assert.ok(!InboxView.container.querySelector('#list-2'));
      });
    });

    suite('remove thread with others in header', function() {
      setup(function() {
        InboxView.removeThread(2);
      });
      test('need to revoke if photoUrl exist', function() {
        sinon.assert.called(window.URL.revokeObjectURL);
      });
      test('no StickyHeader.refresh when not removing a header', function() {
        sinon.assert.notCalled(InboxView.sticky.refresh);
      });
      test('leaves other threads alone', function() {
        assert.ok(InboxView.container.querySelector('#thread-1'));
        assert.ok(InboxView.container.querySelector('#thread-3'));
      });
      test('removes threads', function() {
        assert.ok(!InboxView.container.querySelector('#thread-2'));
      });
      test('retains non-empty header', function() {
        assert.ok(InboxView.container.querySelector('#header-1'));
      });
      test('retains non-empty list', function() {
        assert.ok(InboxView.container.querySelector('#list-1'));
      });
    });

    suite('remove all threads', function() {
      setup(function() {
        this.sinon.stub(InboxView, 'setEmpty');
        InboxView.removeThread(1);
        InboxView.removeThread(2);
        InboxView.removeThread(3);
      });
      test('calls setEmpty(true)', function() {
        assert.ok(InboxView.setEmpty.calledWith(true));
      });
    });

    suite('remove draft links', function() {
      setup(function() {
        this.sinon.stub(InboxView.draftLinks, 'get').returns(1);
        this.sinon.stub(InboxView.draftLinks, 'delete');

        InboxView.removeThread(1);
      });
      test('calls draftLinks.get()', function() {
        assert.isTrue(InboxView.draftLinks.get.called);
      });
      test('calls draftLinks.delete()', function() {
        assert.isTrue(InboxView.draftLinks.delete.called);
      });
    });

    suite('remove draft registry item', function() {
      setup(function() {
        InboxView.draftRegistry = {1: true};
        this.sinon.stub(InboxView.draftLinks, 'get').returns(1);
        this.sinon.stub(InboxView.draftLinks, 'delete');

        InboxView.removeThread(1);
      });
      test('clears draftRegistry', function() {
        assert.isTrue(
          typeof InboxView.draftRegistry[1] === 'undefined'
        );
      });
    });
  });

  suite('updateThread', function() {
    setup(function() {
      this.sinon.spy(Thread, 'create');
      this.sinon.spy(Threads, 'has');
      this.sinon.spy(Threads, 'set');
      this.sinon.spy(InboxView, 'removeThread');
      this.sinon.spy(InboxView, 'appendThread');
      this.sinon.stub(InboxView, 'setContact');
      this.sinon.spy(InboxView, 'mark');
      this.sinon.spy(InboxView, 'setEmpty');
      // This is normally created by renderThreads
      InboxView.sticky = new MockStickyHeader();
      this.sinon.spy(InboxView.sticky, 'refresh');
    });

    teardown(function() {
      Threads.clear();
      InboxView.container.innerHTML = '';
    });

    suite(' > in empty welcome screen,', function() {
      var message;
      setup(function() {
        message = MockMessages.sms();
        InboxView.updateThread(message);
      });

      test('setEmpty & appended', function() {
        sinon.assert.calledOnce(InboxView.setEmpty);

        sinon.assert.calledWithMatch(InboxView.appendThread, {
          id: message.threadId,
          body: message.body,
          lastMessageSubject: message.lastMessageSubject,
          lastMessageType: 'sms',
          messages: sinon.match.instanceOf(Map),
          participants: ['sender'],
          timestamp: message.timestamp,
          unreadCount: 0
        });
      });
    });

    suite(' > Method ', function() {
      var message;
      setup(function() {
        var someDate = new Date(2013, 1, 1);
        insertMockMarkup(someDate);
        // A new message of a previous thread
        var nextDate = new Date(2013, 1, 2);
        message = MockMessages.sms({
          threadId: 2,
          timestamp: +nextDate
        });

        InboxView.updateThread(message);
      });
      test(' > create is called', function() {
        sinon.assert.calledOnce(Thread.create);
      });

      test(' > removeThread is called', function() {
        sinon.assert.calledOnce(InboxView.removeThread);
        sinon.assert.calledOnce(InboxView.appendThread);
      });

      test(' > new message, new thread.', function() {
        var newDate = new Date(2013, 1, 2);
        var newMessage = MockMessages.sms({
          threadId: 20,
          timestamp: +newDate
        });
        InboxView.updateThread(newMessage, { unread: true });
        // As this is a new message we dont have to remove threads
        // So we have only one removeThread for the first appending
        sinon.assert.calledOnce(InboxView.removeThread);
        // But we have appended twice
        sinon.assert.calledTwice(InboxView.appendThread);
      });

      test('only refreshes StickyHeader with new container', function() {
        var sameDate = new Date(2013, 1, 2);
        var newMessage = MockMessages.sms({
          threadId: 3,
          timestamp: +sameDate
        });
        InboxView.updateThread(newMessage);
        // It had to be called once before during setup() since that created a
        // new container.
        sinon.assert.calledOnce(InboxView.sticky.refresh);
      });
    });

    suite(' > same thread exist, older', function() {
      var message, thread;
      setup(function() {
        var someDate = new Date(2013, 1, 1);
        insertMockMarkup(someDate);

        var nextDate = new Date(2013, 1, 2);
        message = MockMessages.sms({
          threadId: 2,
          timestamp: +nextDate
        });
        thread = Thread.create(message);
        InboxView.updateThread(message);
      });

      teardown(function() {
        message = null;
        thread = null;
      });

      test('new thread is appended/updated', function() {
        sinon.assert.calledOnce(InboxView.appendThread);
        // first call, first argument
        sinon.assert.calledWith(InboxView.appendThread, thread);
      });

      test('old thread is removed', function() {
        sinon.assert.calledOnce(InboxView.removeThread);
        sinon.assert.calledWith(InboxView.removeThread, message.threadId);
      });
    });

    suite(' > other threads exist', function() {
      var message, thread;
      setup(function() {
        var someDate = new Date(2013, 1, 1);
        insertMockMarkup(someDate);

        var nextDate = new Date(2013, 1, 2);
        message = MockMessages.sms({
          threadId: 3,
          timestamp: +nextDate
        });
        thread = Thread.create(message);
        InboxView.updateThread(message);
      });

      teardown(function() {
        message = null;
        thread = null;
      });

      test('new thread is appended', function() {
        sinon.assert.calledOnce(InboxView.appendThread);
        // first call, first argument
        sinon.assert.calledWith(InboxView.appendThread, thread);
      });

      test('no thread is removed', function() {
        assert.isFalse(InboxView.removeThread.called);
      });

      test('Refresh the fixed header', function() {
        sinon.assert.called(InboxView.sticky.refresh);
      });
    });

    suite(' > same thread exist, but newer', function() {
      var message;

      setup(function() {
        var someDate = new Date(2013, 1, 1);
        insertMockMarkup(someDate);

        var prevDate = new Date(2013, 1, 0);
        message = MockMessages.sms({
          threadId: 2,
          timestamp: +prevDate
        });
        InboxView.updateThread(message, { unread: true });
      });

      test('no new thread is appended', function() {
        assert.isFalse(InboxView.appendThread.called);
      });

      test('no old thread is removed', function() {
        assert.isFalse(InboxView.removeThread.called);
      });

      test('old thread is marked unread', function() {
        sinon.assert.called(InboxView.mark);
        sinon.assert.calledWith(InboxView.mark, message.threadId, 'unread');

        var container = document.getElementById('thread-2');
        assert.isTrue(container.classList.contains('unread'));
      });
    });

    suite(' > delete old message in a thread', function() {
      var message, threadContainer;

      /**
       * When an old message is deleted, the thread UI has the same timestamp
       * as the last message.
       */

      setup(function() {
        var someDate = new Date(2013, 1, 1);
        insertMockMarkup(someDate);
        message = MockMessages.sms({
          threadId: 2,
          timestamp: +someDate
        });
        threadContainer = document.getElementById('thread-2');
        InboxView.updateThread(message, { deleted: true });
      });

      test('> the thread is not updated', function() {
        assert.equal(threadContainer, document.getElementById('thread-2'));
      });
    });

    suite(' > delete latest message in a thread', function() {
      var message, threadContainer;

      /**
       * When the latest message is deleted, the thread UI has a newer timestamp
       * than the last message.
       */

      setup(function() {
        var someDate = new Date(2013, 1, 1);
        insertMockMarkup(someDate);

        var newDate = new Date(2013, 1, 2);
        message = MockMessages.sms({
          threadId: 2,
          timestamp: +newDate
        });
        threadContainer = document.getElementById('thread-2');
        InboxView.updateThread(message, { deleted: true });
      });

      test('> the thread is updated', function() {
        assert.ok(threadContainer !== document.getElementById('thread-2'));
      });

      test('> the thread is marked as read', function() {
        var newContainer = document.getElementById('thread-2');
        assert.isFalse(newContainer.classList.contains('unread'));
      });
    });

    suite(' > update in-memory threads', function() {
      setup(function() {
        Threads.set(1, {
          id: 1,
          participants: ['555'],
          lastMessageType: 'sms',
          body: 'Hello 555',
          timestamp: Date.now(),
          unreadCount: 0
        });

        // This is used to reset the spy record
        Threads.set.reset();
      });

      test('Threads.set is called', function() {
        InboxView.updateThread({
          id: 1
        });
        assert.isTrue(Threads.set.calledOnce);
      });

      test('Threads.set is called even id has no match', function() {
        InboxView.updateThread({
          id: 2
        });
        assert.isTrue(Threads.set.calledOnce);
      });
    });
  });

  suite('markReadUnread', function() {
    setup(function() {
      var threads = [{
        id: 1,
        date: new Date(2013, 1, 2),
        unread: false
      }, {
        id: 2,
        date: new Date(2013, 1, 0),
        unread: true
      }, {
        id: 3,
        date: new Date(2013, 1, 2),
        unread: true
      }, {
        id: 4,
        date: new Date(2013, 1, 0),
        unread: true
      }, {
        id: 5,
        date: new Date(2013, 1, 2),
        unread: false
      }, {
        id: 6,
        date: new Date(2013, 1, 0),
        unread: false
      }];

      threads.forEach((threadInfo) => {
        var thread = Thread.create(MockMessages.sms({
          threadId: threadInfo.id,
          timestamp: +threadInfo.date
        }), { unread: threadInfo.unread });
        Threads.set(thread.id, thread);
        InboxView.appendThread(thread);
      });

      InboxView.selectionHandler = null;
      InboxView.startEdit();
    });

    test('one read and one unread Thread', function() {
      var firstThreadNode = document.getElementById('thread-1'),
          secondThreadNode = document.getElementById('thread-2');

      InboxView.selectionHandler.selected = new Set(['1', '2']);

      InboxView.updateSelectionStatus();
      InboxView.markReadUnread(
        InboxView.selectionHandler.selectedList,
        true
      );

      assert.isFalse(firstThreadNode.classList.contains('unread'));
      assert.isFalse(secondThreadNode.classList.contains('unread'));
    });

    test('both Threads are unread', function() {
      var firstThreadNode = document.getElementById('thread-3'),
          secondThreadNode = document.getElementById('thread-4');

      InboxView.selectionHandler.selected = new Set(['3', '4']);

      InboxView.updateSelectionStatus();
      InboxView.markReadUnread(
        InboxView.selectionHandler.selectedList,
        true
      );

      assert.isFalse(firstThreadNode.classList.contains('unread'));
      assert.isFalse(secondThreadNode.classList.contains('unread'));
    });

    test('both Threads are read', function() {
     var firstThreadNode = document.getElementById('thread-5'),
         secondThreadNode = document.getElementById('thread-6');

      InboxView.selectionHandler.selected = new Set(['5', '6']);

      InboxView.updateSelectionStatus();
      InboxView.markReadUnread(
        InboxView.selectionHandler.selectedList,
        false
      );

      assert.isTrue(firstThreadNode.classList.contains('unread'));
      assert.isTrue(secondThreadNode.classList.contains('unread'));
    });
  });

  suite('delete', function() {
    var threadDraftIds = [100, 200],
        threadIds = [1, 2, 3];

    setup(function() {
      this.sinon.stub(MessageManager, 'getMessages');

      var drafts = threadDraftIds.map((id) => {
        var draft = new Draft({
          id: id,
          threadId: id,
          recipients: [],
          content: ['An explicit id'],
          timestamp: Date.now(),
          type: 'sms'
        });
        var thread = Thread.create(draft);

        Drafts.add(draft);
        Threads.set(draft.id, thread);

        return thread;
      });

      var threads = threadIds.map((id) => {
        var thread = Thread.create(MockMessages.sms({
          threadId: id,
          timestamp: Date.now()
        }));

        Threads.set(id, thread);

        return thread;
      });

      drafts.concat(threads).forEach(function(thread) {
        InboxView.appendThread(thread);

        assert.isNotNull(document.getElementById('thread-' +thread.id));
      });

      InboxView.selectionHandler = null;
      InboxView.startEdit();
    });

    teardown(function() {
      InboxView.container = '';
      Drafts.clear();
      InboxView.cancelEdit();
    });

    suite('confirm true', function() {
      function getMessagesCallParams(threadId) {
        return  {
          each: sinon.match.func,
          end: sinon.match.func,
          filter: { threadId: threadId }
        };
      }

      function selectThreadsAndDelete(threadIds) {
        var selectedIds = threadIds.map(threadId => '' + threadId);

        InboxView.selectionHandler.selected = new Set(selectedIds);

        return InboxView.delete(InboxView.selectionHandler.selectedList);
      }

      setup(function() {
        this.sinon.stub(WaitingScreen, 'show');
        this.sinon.stub(WaitingScreen, 'hide');
        this.sinon.stub(MessageManager, 'deleteMessages');
        this.sinon.stub(Utils, 'confirm').returns(Promise.resolve());
      });

      test('called confirm with proper message', function(done) {
        selectThreadsAndDelete(threadDraftIds).then(() => {
          sinon.assert.calledWith(
            Utils.confirm,
            {
              id: 'deleteThreads-confirmation-message',
              args: { n: threadDraftIds.length }
            },
            null,
            {
              text: 'delete',
              className: 'danger'
            }
          );
        }).then(done, done);
      });

      suite('delete drafts only', function() {
        setup(function(done) {
          this.sinon.spy(Drafts, 'store');

          threadDraftIds.forEach((id) => {
            assert.isTrue(Drafts.byThreadId(id).length > 0);
          });

          selectThreadsAndDelete(threadDraftIds).then(done, done);
        });

        test('removes thread draft from the DOM', function() {
          sinon.assert.called(WaitingScreen.show);

          threadDraftIds.forEach((id) => {
            assert.isTrue(Drafts.byThreadId(id).length === 0);
          });

          assert.isNull(document.getElementById('thread-100'));
          assert.isNull(document.getElementById('thread-200'));

          sinon.assert.called(Drafts.store);
          sinon.assert.called(WaitingScreen.hide);
          sinon.assert.notCalled(MessageManager.getMessages);
          sinon.assert.notCalled(MessageManager.deleteMessages);
        });
      });

      suite('delete real threads only', function() {
        var threadsToDelete = threadIds.slice(0, 2);

        setup(function(done) {
          this.sinon.spy(Drafts, 'store');
          this.sinon.spy(Utils, 'closeNotificationsForThread');

          selectThreadsAndDelete(threadsToDelete).then(done, done);
        });

        test('getMessages is called for the right thread', function() {
          sinon.assert.calledTwice(MessageManager.getMessages);

          threadsToDelete.forEach((id) => {
            sinon.assert.calledWith(
              MessageManager.getMessages, getMessagesCallParams(id)
            );
          });
        });

        test('MessageManager.deleteMessages is called', function() {
          sinon.assert.called(WaitingScreen.show);

          threadsToDelete.forEach((id) => {
            MessageManager.getMessages.withArgs(getMessagesCallParams(id)).
              yieldTo('each', { id: id * 10 });
            MessageManager.getMessages.withArgs(getMessagesCallParams(id)).
              yieldTo('each', { id: id * 100 });

            sinon.assert.notCalled(MessageManager.deleteMessages);
          });

          threadsToDelete.forEach((id, index, list) => {
            MessageManager.getMessages.withArgs(getMessagesCallParams(id)).
              yieldTo('end');

            // Delete call is performed only if messages for all threads to
            // delete were retrieved, the same is for WaitingScreen.hide
            assert.equal(
              MessageManager.deleteMessages.called, index === list.length - 1
            );
            assert.equal(
              WaitingScreen.hide.called, index === list.length - 1
            );
          });

          sinon.assert.calledOnce(MessageManager.deleteMessages);
          sinon.assert.calledWith(
            MessageManager.deleteMessages, [10, 100, 20, 200]
          );

          threadsToDelete.forEach(function(threadId) {
            assert.isNull(document.getElementById('thread-' + threadId));
            assert.isFalse(Threads.has(threadId));
            sinon.assert.calledWith(
              Utils.closeNotificationsForThread, threadId
            );
          });

          sinon.assert.notCalled(Drafts.store);
          sinon.assert.called(WaitingScreen.hide);
        });
      });

      suite('delete both real threads and drafts', function() {
        var threadsToDelete = threadDraftIds.concat(threadIds);

        setup(function(done) {
          this.sinon.spy(Drafts, 'store');
          this.sinon.spy(Utils, 'closeNotificationsForThread');

          selectThreadsAndDelete(threadsToDelete).then(done, done);
        });

        test('getMessages is called for the right thread', function() {
          sinon.assert.calledThrice(MessageManager.getMessages);

          threadIds.forEach((id) => {
            sinon.assert.calledWith(
              MessageManager.getMessages, getMessagesCallParams(id)
            );
          });
        });

        test('MessageManager.deleteMessages is called', function() {
          sinon.assert.called(WaitingScreen.show);

          // First drafts are deleted
          threadDraftIds.forEach((id) => {
            assert.isTrue(Drafts.byThreadId(id).length === 0);
          });

          assert.isNotNull(document.getElementById('thread-1'));
          assert.isNotNull(document.getElementById('thread-2'));
          assert.isNotNull(document.getElementById('thread-3'));
          assert.isNull(document.getElementById('thread-100'));
          assert.isNull(document.getElementById('thread-200'));

          // Don't hide waiting screen until full deletion is finished
          sinon.assert.notCalled(WaitingScreen.hide);
          sinon.assert.called(Drafts.store);

          threadIds.forEach((id) => {
            MessageManager.getMessages.withArgs(getMessagesCallParams(id)).
              yieldTo('each', { id: id * 10 });
            MessageManager.getMessages.withArgs(getMessagesCallParams(id)).
              yieldTo('each', { id: id * 100 });

            sinon.assert.notCalled(MessageManager.deleteMessages);
          });

          threadIds.forEach((id, index, list) => {
            MessageManager.getMessages.withArgs(getMessagesCallParams(id)).
              yieldTo('end');

            // Delete call is performed only if messages for all threads to
            // delete were retrieved, the same is for WaitingScreen.hide
            assert.equal(
              MessageManager.deleteMessages.called, index === list.length - 1
            );
            assert.equal(
              WaitingScreen.hide.called, index === list.length - 1
            );
          });

          sinon.assert.calledOnce(MessageManager.deleteMessages);
          sinon.assert.calledWith(
            MessageManager.deleteMessages, [10, 100, 20, 200, 30, 300]
          );

          threadIds.forEach((id) => {
            assert.isNull(document.getElementById('thread-' + id));
            assert.isFalse(Threads.has(id));
            sinon.assert.calledWith(
              Utils.closeNotificationsForThread, id
            );
          });
        });
      });
    });

    test('onThreadsDeleted', function() {
      MessageManager.on.withArgs('threads-deleted').yield({ ids: [1, 2, 4] });

      assert.isNull(document.getElementById('thread-1'));
      assert.isNull(document.getElementById('thread-2'));
      assert.isNotNull(document.getElementById('thread-3'));
      assert.isNotNull(document.getElementById('thread-100'));
      assert.isNotNull(document.getElementById('thread-200'));
    });
  });

  suite('createThread', function() {
    setup(function() {
      this.sinon.spy(Template, 'escape');
      this.sinon.spy(MockTimeHeaders, 'update');
    });

    function buildSMSThread(payload) {
      var o = {
        id: 1,
        lastMessageType: 'sms',
        participants: ['1234'],
        body: payload,
        timestamp: Date.now()
      };
      Threads.set(o.id, o);
      return o;
    }

    function buildMMSThread(payload) {
      var o = {
        id: 1,
        lastMessageType: 'mms',
        participants: ['1234', '5678'],
        body: payload,
        timestamp: Date.now()
      };
      Threads.set(o.id, o);
      return o;
    }

    test('escapes the body for SMS', function() {
      var payload = 'hello <a href="world">world</a>';
      InboxView.createThread(buildSMSThread(payload));
      assert.ok(Template.escape.calledWith(payload));
      assert.ok(MockTimeHeaders.update.called);
    });

    test('escapes the body for MMS', function() {
      var payload = 'hello <a href="world">world</a>';
      InboxView.createThread(buildMMSThread(payload));
      assert.ok(Template.escape.calledWith(payload));
      assert.ok(MockTimeHeaders.update.called);
    });

    suite('Correctly displayed content', function() {
      var now, message, li;

      setup(function() {
        this.sinon.stub(Threads, 'get').returns({
          hasDrafts: true
        });

        now = Date.now();

        message = MockMessages.sms({
          delivery: 'delivered',
          threadId: 1,
          timestamp: now,
          body: 'from a message'
        });
      });

      test('Message newer than draft is used', function() {
        this.sinon.stub(Drafts, 'byThreadId').returns({
          latest: {
            timestamp: now - 60000,
            content: ['from a draft']
          }
        });
        li = InboxView.createThread(
          Thread.create(message)
        );

        assert.equal(
          li.querySelector('.body-text').textContent, 'from a message'
        );
      });

      test('Draft newer than content is used', function() {
        this.sinon.stub(Drafts, 'byThreadId').returns({
          latest: {
            timestamp: now,
            content: ['from a draft']
          }
        });
        message.timestamp = now - 60000;
        li = InboxView.createThread(
          Thread.create(message)
        );

        assert.equal(
          li.querySelector('.body-text').textContent, 'from a draft'
        );
      });

      test('Draft newer, but has no content', function() {
        this.sinon.stub(Drafts, 'byThreadId').returns({
          latest: {
            timestamp: now,
            content: []
          }
        });
        message.timestamp = now - 60000;
        li = InboxView.createThread(
          Thread.create(message)
        );

        assert.equal(
          li.querySelector('.body-text').textContent, ''
        );
      });

      test('Last message type for draft', function() {
        this.sinon.stub(Drafts, 'byThreadId').returns({
          latest: {
            timestamp: now,
            content: [],
            type: 'mms'
          }
        });
        li = InboxView.createThread(
          Thread.create(message)
        );

        assert.ok(li.dataset.lastMessageType, 'mms');
      });
    });
  });

  suite('onMessageReceived >', function() {
    var firstMessage, secondMessage;

    setup(function() {
      this.sinon.spy(InboxView, 'updateThread');
      this.sinon.stub(InboxView, 'setContact');

      firstMessage = MockMessages.sms({
        id: 100,
        threadId: 1
      });

      secondMessage = MockMessages.sms({
        id: 200,
        threadId: 1
      });
    });

    teardown(function() {
      Threads.clear();
    });

    test('Thread is correctly updated', function() {
      MessageManager.on.withArgs('message-received').yield({
        message: firstMessage
      });

      sinon.assert.calledWith(InboxView.updateThread, firstMessage, {
        unread: true
      });
    });

    test('Thread is correctly marked as read', function() {
      MessageManager.on.withArgs('message-received').yield({
        message: firstMessage
      });

      sinon.assert.calledWith(InboxView.updateThread, firstMessage, {
        unread: true
      });

      // Moving to the thread panel
      this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
      Navigation.isCurrentPanel.withArgs('thread', {
        id: firstMessage.threadId
      }).returns(true);

      MessageManager.on.withArgs('message-received').yield({
        message: secondMessage
      });

      sinon.assert.calledWith(InboxView.updateThread, secondMessage, {
        unread: false
      });
    });
  });

  suite('onMessageSending >', function() {
    var firstMessage, secondMessage;

    setup(function() {
      this.sinon.spy(InboxView, 'updateThread');
      this.sinon.stub(InboxView, 'setContact');

      firstMessage = MockMessages.sms({
        id: 100,
        threadId: 1
      });

      secondMessage = MockMessages.sms({
        id: 200,
        threadId: 1
      });
    });

    teardown(function() {
      Threads.clear();
    });

    test('Thread is correctly updated', function() {
      MessageManager.on.withArgs('message-sending').yield({
        message: firstMessage
      });

      sinon.assert.calledWith(InboxView.updateThread, firstMessage);
    });
  });

  suite('appendThread', function() {
    setup(function() {
      this.sinon.stub(InboxView, 'setContact');
      this.sinon.stub(InboxView, 'updateSelectionStatus');
    });

    suite('new thread and new message in a day', function() {
      var thread;

      setup(function() {
        var someDate = new Date(2013, 1, 1).getTime();
        insertMockMarkup(someDate);

        var nextDate = new Date(2013, 1, 2);
        var message = MockMessages.sms({
          threadId: 3,
          timestamp: +nextDate
        });

        thread = Thread.create(message);
        Threads.set(thread.id, thread);
      });

      test('show up in a new container', function() {
        InboxView.appendThread(thread);
        var newContainerId = 'threadsContainer_' + (+thread.timestamp);
        var newContainer = document.getElementById(newContainerId);
        assert.ok(newContainer);
        assert.ok(newContainer.querySelector('li'));
        var expectedThreadId = 'thread-' + thread.id;
        assert.equal(newContainer.querySelector('li').id, expectedThreadId);
      });

      test('should return false when adding to existing thread', function() {
        assert.isTrue(InboxView.appendThread(thread));
        assert.isFalse(InboxView.appendThread(thread));
      });
    });

    suite('existing thread and new message in a day', function() {
      var thread;
      var someDate;

      var appendSingleNewMessage = function() {
        var nextDate = new Date(2013, 1, 1, 0, 0, 1);
        var message = MockMessages.sms({
          threadId: 2,
          timestamp: +nextDate
        });
        thread = Thread.create(message);
        InboxView.appendThread(thread);

        var containerId = 'threadsContainer_' + (+someDate);
        var container = document.getElementById(containerId);
        var threads = container.getElementsByTagName('li');
        assert.equal(message.timestamp, threads[1].dataset.time);
      };

      setup(function() {
        someDate = new Date(2013, 1, 1).getTime();
        insertMockMarkup(someDate);

        var nextDate = new Date(2013, 1, 1, 0, 0, 2);
        var message = MockMessages.sms({
          threadId: 2,
          timestamp: +nextDate
        });

        thread = Thread.create(message);
        Threads.set(thread.id, thread);
      });

      test('show up in same container', function() {
        InboxView.appendThread(thread);
        var existingContainerId = 'threadsContainer_' + (+someDate);
        var existingContainer = document.getElementById(existingContainerId);
        assert.ok(existingContainer);
        assert.ok(existingContainer.querySelector('li'));
        var expectedThreadId = 'thread-' + thread.id;
        assert.equal(existingContainer.querySelector('li').id,
                     expectedThreadId);
      });

      test('should be inserted in the right spot', function() {
        InboxView.appendThread(thread);
        appendSingleNewMessage();
      });

      test('in edit mode and a new message arrives', function() {
        InboxView.appendThread(thread);
        InboxView.startEdit();
        appendSingleNewMessage();
        InboxView.cancelEdit();
      });

      test('should return false when adding to existing thread', function() {
        assert.isFalse(InboxView.appendThread(thread));
      });
    });

    suite('respects l10n lib readiness', function() {
      setup(function() {
        navigator.mozL10n.readyState = 'loading';
        this.sinon.stub(navigator.mozL10n, 'once');
      });

      teardown(function() {
        navigator.mozL10n.readyState = 'complete';
      });

      test('waits for l10n to render', function() {
        var thread = Thread.create(MockMessages.sms({
          threadId: 3,
          timestamp: +(new Date(2013, 1, 2))
        }));

        var containerId = 'threadsContainer_' + thread.timestamp;

        InboxView.appendThread(thread);

        var container = document.getElementById(containerId);

        // Since mozL10n is not ready nothing should be rendered
        assert.ok(!container);

        navigator.mozL10n.readyState = 'complete';
        navigator.mozL10n.once.yield();

        container = document.getElementById(containerId);
        assert.ok(container);
        assert.equal(container.querySelector('li').id, 'thread-' + thread.id);
      });
    });
  });

  suite('renderThreads', function() {
    var firstViewDone, panel;
    setup(function() {
      this.sinon.spy(InboxView, 'setEmpty');
      this.sinon.spy(InboxView, 'prepareRendering');
      this.sinon.spy(InboxView, 'startRendering');
      this.sinon.spy(InboxView, 'finalizeRendering');
      this.sinon.spy(InboxView, 'renderThreads');
      this.sinon.spy(InboxView, 'appendThread');
      this.sinon.spy(InboxView, 'createThread');
      this.sinon.spy(InboxView, 'setContact');
      this.sinon.spy(InboxView, 'renderDrafts');
      this.sinon.spy(MockStickyHeader.prototype, 'refresh');
      this.sinon.spy(window, 'StickyHeader');

      this.sinon.stub(Settings, 'setReadAheadThreadRetrieval');

      firstViewDone = sinon.stub();
      panel = document.getElementById('thread-list');

      Threads.clear();
    });

    test('Rendering an empty screen', function(done) {
      this.sinon.stub(MessageManager, 'getThreads', function(options) {
        options.end();
        options.done();
      });

      InboxView.renderThreads(firstViewDone).then(function() {
        sinon.assert.called(firstViewDone);
        sinon.assert.called(InboxView.renderDrafts);
        sinon.assert.called(StickyHeader);
        sinon.assert.calledWith(InboxView.finalizeRendering, true);
        assert.isTrue(panel.classList.contains('threadlist-is-empty'));
      }).then(done, done);
    });

    test('Rendering a few threads', function(done) {
      var container = InboxView.container;

      this.sinon.stub(MessageManager, 'getThreads',
        function(options) {
          var threadsMockup = new MockThreadList({
            fullList : true
          });

          var each = options.each;
          var end = options.end;
          var done = options.done;

          for (var i = 0; i < threadsMockup.length; i++) {
            each && each(threadsMockup[i]);

            // When the returned threads reach first panel amount, firstViewDone
            // shoule be call here instead of whole iteration finished.
            if (i < 8) {
              sinon.assert.notCalled(firstViewDone);
            } else {
              sinon.assert.calledOnce(firstViewDone);
            }

            var threads = container.querySelectorAll(
                '[data-last-message-type="sms"],' +
                '[data-last-message-type="mms"]'
            );

            // Check that a thread is inserted per iteration
            assert.equal(threads.length, i + 1);
          }

          end && end();
          done && done();
        });

      InboxView.renderThreads(firstViewDone).then(function() {
        sinon.assert.calledWith(InboxView.finalizeRendering, false);
        assert.isFalse(panel.classList.contains('threadlist-is-empty'));
        sinon.assert.called(StickyHeader);
        sinon.assert.called(InboxView.sticky.refresh);

        var mmsThreads = container.querySelectorAll(
          '[data-last-message-type="mms"]'
        );
        var smsThreads = container.querySelectorAll(
          '[data-last-message-type="sms"]'
        );

        // Check that all threads have been properly inserted in the list
        assert.equal(mmsThreads.length, 2);
        assert.equal(smsThreads.length, 8);

        sinon.assert.calledWith(
          Settings.setReadAheadThreadRetrieval,
          InboxView.FIRST_PANEL_THREAD_COUNT
        );
      }).then(done, done);
    });

    suite('Individual thread actions', function() {
      var threadList;

      setup(function() {
        threadList = new MockThreadList();

        this.sinon.stub(MessageManager, 'getThreads', (options) => {
          threadList.forEach((thread) => options.each && options.each(thread));

          options.end && options.end();
          options.done && options.done();
        });
      });

      test('Sets every thread to Threads object', function(done) {
        InboxView.renderThreads(() => {
          threadList.forEach((thread) => assert.isTrue(Threads.has(thread.id)));
        }).then(done, done);
      });

      test('Updates thread UI header if thread to render is currently active',
      function(done) {
        this.sinon.spy(ConversationView, 'updateHeaderData');
        this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
        Navigation.isCurrentPanel.withArgs('thread', { id: threadList[0].id }).
          returns(true);

        InboxView.renderThreads(
          () => sinon.assert.calledOnce(ConversationView.updateHeaderData)
        ).then(done, done);
      });
    });
  });

  suite('renderDrafts', function() {
    var draft;
    var thread, threadDraft;

    setup(function(done) {
      this.sinon.spy(InboxView, 'renderThreads');
      this.sinon.spy(InboxView, 'appendThread');
      this.sinon.spy(InboxView, 'createThread');
      this.sinon.spy(InboxView, 'updateThread');
      this.sinon.spy(InboxView, 'setContact');

      var someDate = new Date(2013, 1, 1).getTime();
      insertMockMarkup(someDate);

      var nextDate = new Date(2013, 1, 2);
      var message = MockMessages.sms({
        threadId: 3,
        timestamp: +nextDate
      });

      Threads.registerMessage(message);
      thread = Threads.get(3);
      InboxView.appendThread(thread);

      threadDraft = new Draft({
        id: 102,
        threadId: 3,
        recipients: [],
        content: ['An explicit id'],
        timestamp: Date.now(),
        type: 'sms'
      });

      Drafts.add(threadDraft);

      draft = new Draft({
        id: 101,
        threadId: null,
        recipients: [],
        content: ['An explicit id'],
        timestamp: Date.now(),
        type: 'sms'
      });

      Drafts.add(draft);

      this.sinon.stub(Drafts, 'request').returns(
        Promise.resolve([draft, threadDraft])
      );

      InboxView.draftLinks = new Map();
      InboxView.draftRegistry = {};

      InboxView.renderDrafts().then(done, done);
    });

    teardown(function() {
      Drafts.clear();
    });

    test('Draft.request is called', function() {
      sinon.assert.called(Drafts.request);
    });

    test('InboxView.appendThread is called', function() {
      sinon.assert.called(InboxView.appendThread);
    });

    test('InboxView.createThread is called', function() {
      sinon.assert.called(InboxView.createThread);
    });

    test('InboxView.updateThread is called', function() {
      sinon.assert.called(InboxView.updateThread);
    });

    test('InboxView.setContact is called', function() {
      sinon.assert.called(InboxView.setContact);
    });

    test('click on a draft populates ConversationView.draft', function() {
      document.querySelector('#thread-101 a').click();
      assert.equal(ConversationView.draft, draft);
    });

    test('should re-request drafts if they are changed by another app instance',
    function() {
      InterInstanceEventDispatcher.on.withArgs('drafts-changed').yield();

      sinon.assert.calledWith(Drafts.request, true);
    });
  });

  suite('draftSaved', function() {

    setup(function() {
      this.sinon.useFakeTimers();
    });

    test('draft saved banner shown and hidden', function() {
      assert.isTrue(draftSavedBanner.classList.contains('hide'));
      InboxView.onDraftSaved();
      assert.isFalse(draftSavedBanner.classList.contains('hide'));
      this.sinon.clock.tick(InboxView.DRAFT_SAVED_DURATION - 1);
      assert.isFalse(draftSavedBanner.classList.contains('hide'));
      this.sinon.clock.tick(1);
      assert.isTrue(draftSavedBanner.classList.contains('hide'));
    });
  });

  suite('setContact', function() {
    var thread,
        groupThread,
        realWindowInnerHeight;

    setup(function() {
      this.sinon.stub(Contacts, 'findByAddress');
      this.sinon.spy(Contacts, 'addUnknown');
      this.sinon.stub(window.URL, 'revokeObjectURL');

      realWindowInnerHeight = Object.getOwnPropertyDescriptor(
        window, 'innerWidth'
      );

      var oneToOneThread = {
        id: 1,
        participants: ['555'],
        lastMessageType: 'sms',
        body: 'Hello 555',
        timestamp: Date.now(),
        unreadCount: 0
      };

      var oneToManyThread = {
        id: 2,
        participants: ['555', '666'],
        lastMessageType: 'mms',
        body: 'Hello 555',
        timestamp: Date.now(),
        unreadCount: 0
      };
      Threads.set(oneToOneThread.id, oneToOneThread);
      Threads.set(oneToManyThread.id, oneToManyThread);

      var node = InboxView.createThread(oneToOneThread);
      thread = {
        node: node,
        pictureContainer: node.querySelector('.threadlist-item-picture'),
        picture: node.querySelector('[data-type=img]')
      };

      node = InboxView.createThread(oneToManyThread);
      groupThread = {
        node: node,
        pictureContainer: node.querySelector('.threadlist-item-picture'),
        picture: node.querySelector('[data-type=img]')
      };
    });

    teardown(function() {
      InboxView.container.textContent = '';
      Object.defineProperty(window, 'innerWidth', realWindowInnerHeight);
    });

    test('display the picture of a contact', function(done) {
      var contactInfo = MockContact.list();
      contactInfo[0].photo = [new Blob(['test'], { type: 'image/jpeg' })];
      Contacts.findByAddress.returns(Promise.resolve(contactInfo));

      InboxView.setContact(thread.node).then(() => {
        assert.include(thread.node.dataset.photoUrl, 'blob:');
        assert.isFalse(
          thread.pictureContainer.classList.contains('default-picture')
        );
        assert.isTrue(
          thread.pictureContainer.classList.contains('has-picture')
        );
        var backgroundImages = thread.picture.style.backgroundImage.split(', ');
        assert.equal(
          backgroundImages.length,
          2,
          'Multiple background images should be used'
        );
        assert.include(backgroundImages[0], thread.node.dataset.photoUrl);
        assert.include(backgroundImages[1], 'default_contact_image.png');

        sinon.assert.notCalled(Contacts.addUnknown);
      }).then(done, done);
    });

    test('display correctly a contact without a picture', function(done) {
      Contacts.findByAddress.returns(Promise.resolve(MockContact.list()));

      InboxView.setContact(thread.node).then(() => {
        assert.isTrue(
          thread.pictureContainer.classList.contains('default-picture')
        );
        assert.isTrue(
          thread.pictureContainer.classList.contains('has-picture')
        );
        assert.equal(thread.picture.style.backgroundImage, '');
        sinon.assert.notCalled(Contacts.addUnknown);
      }).then(done, done);
    });

    test('correctly revokes old contact image blob URL', function(done) {
      Contacts.findByAddress.returns(Promise.resolve(MockContact.list()));

      // Doesn't revoke anything if nothing to revoke
      thread.node.dataset.photoUrl = '';
      InboxView.setContact(thread.node).then(() => {
        sinon.assert.notCalled(window.URL.revokeObjectURL);

        // Call revoke if we had image before and now contact also has image
        thread.node.dataset.photoUrl = 'blob://data#1';
        var contactInfo = MockContact.list();
        contactInfo[0].photo = [new Blob(['test'], { type: 'image/jpeg' })];
        Contacts.findByAddress.returns(Promise.resolve(contactInfo));

        return InboxView.setContact(thread.node);
      }).then(() => {
        sinon.assert.calledWith(window.URL.revokeObjectURL, 'blob://data#1');

        // Call revoke if we had image before, but don't have it now
        thread.node.dataset.photoUrl = 'blob://data#2';
        Contacts.findByAddress.returns(Promise.resolve(MockContact.list()));

        return InboxView.setContact(thread.node);
      }).then(() => {
        sinon.assert.calledWith(window.URL.revokeObjectURL, 'blob://data#2');
        assert.equal(thread.node.dataset.photoUrl, '');
      }).then(done, done);
    });

    test('display correctly an unknown number', function(done) {
      Contacts.findByAddress.returns(Promise.resolve([]));

      InboxView.setContact(thread.node).then(() => {
        assert.equal(thread.picture.style.backgroundImage, '');
        assert.isFalse(
          thread.pictureContainer.classList.contains('default-picture')
        );
        assert.isFalse(
          thread.pictureContainer.classList.contains('has-picture')
        );
        sinon.assert.calledWith(Contacts.addUnknown, '555');
      }).then(done, done);
    });

    test('display correctly a group MMS thread', function(done) {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        get: () => 400
      });
      InboxView.init();

      Contacts.findByAddress.withArgs('555').returns(Promise.resolve(
        MockContact.list([{
          givenName: ['James'],
          familyName: ['Bond']
        }])
      ));

      Contacts.findByAddress.withArgs('666').returns(Promise.resolve(
        MockContact.list([{
          givenName: ['Bond'],
          familyName: ['James']
        }])
      ));

      InboxView.setContact(groupThread.node).then(() => {
        var threadTitleNode = groupThread.node.querySelector(
          '.threadlist-item-title'
        );

        assert.isFalse(
          groupThread.picture.style.backgroundImage.contains('blob:')
        );
        assert.isTrue(
          groupThread.pictureContainer.classList.contains('group-picture')
        );
        assert.isTrue(
          groupThread.pictureContainer.classList.contains('has-picture')
        );
        assert.equal(groupThread.picture.textContent, '2');
        assert.equal(
          threadTitleNode.innerHTML,
          '<span>' +
            '<bdi>James Bond</bdi>' +
            '<span data-l10n-id="thread-participant-separator"></span>' +
            '<bdi>Bond James</bdi>' +
          '</span>'
        );
      }).then(done, done);
    });

    test('display correctly a group MMS thread with lots of participants',
    function(done) {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        get: () => 200
      });
      InboxView.init();

      Contacts.findByAddress.withArgs('555').returns(Promise.resolve(
        MockContact.list([{
          givenName: ['James'],
          familyName: ['Bond']
        }])
      ));

      InboxView.setContact(groupThread.node).then(() => {
        var threadTitleNode = groupThread.node.querySelector(
          '.threadlist-item-title'
        );

        sinon.assert.calledOnce(Contacts.findByAddress);
        sinon.assert.calledWith(Contacts.findByAddress, '555');
        assert.isFalse(
          groupThread.picture.style.backgroundImage.contains('blob:')
        );
        assert.isTrue(
          groupThread.pictureContainer.classList.contains('group-picture')
        );
        assert.isTrue(
          groupThread.pictureContainer.classList.contains('has-picture')
        );
        assert.equal(groupThread.picture.textContent, '2');
        assert.equal(
          threadTitleNode.innerHTML,
          '<span><bdi>James Bond</bdi></span>'
        );
      }).then(done, done);
    });
  });

  suite('[Email]setContact', function() {
    var node, pictureContainer, picture;

    setup(function() {
      this.sinon.stub(Contacts, 'findByAddress');
      this.sinon.spy(Utils.Promise, 'defer');
      var thread = {
        id: 1,
        participants: ['a@b.com'],
        lastMessageType: 'mms',
        body: 'Hello a@b.com',
        timestamp: Date.now(),
        unreadCount: 0
      };

      Threads.set(1, thread);
      node = InboxView.createThread(thread);
      pictureContainer = node.querySelector('.threadlist-item-picture');
      picture = node.querySelector('[data-type=img]');
    });

    teardown(function() {
      InboxView.container.textContent = '';
    });

    test('[Email]display the picture of a contact', function(done) {
      MockSettings.supportEmailRecipient = true;

      var contactInfo = MockContact.list();
      contactInfo[0].photo = [new Blob(['test'], { type: 'image/jpeg' })];
      Contacts.findByAddress.returns(Promise.resolve(contactInfo));

      InboxView.setContact(node).then(() => {
        assert.include(node.dataset.photoUrl, 'blob:');
        assert.isFalse(pictureContainer.classList.contains('default-picture'));
        assert.isTrue(pictureContainer.classList.contains('has-picture'));
        var backgroundImages = picture.style.backgroundImage.split(', ');
        assert.equal(
          backgroundImages.length,
          2,
          'Multiple background images should be used'
        );
        assert.include(backgroundImages[0], node.dataset.photoUrl);
        assert.include(backgroundImages[1], 'default_contact_image.png');
      }).then(done, done);
    });

    test('[Email]display correctly a contact without a picture',
    function(done) {
      MockSettings.supportEmailRecipient = true;
      var contactInfo = MockContact.list();
      Contacts.findByAddress.returns(Promise.resolve(contactInfo));

      InboxView.setContact(node).then(() => {
        assert.isTrue(pictureContainer.classList.contains('default-picture'));
        assert.isTrue(pictureContainer.classList.contains('has-picture'));
        assert.equal(picture.style.backgroundImage, '');
      }).then(done, done);
    });
  });

  suite('beforeLeave()', function() {
    setup(function() {

      this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
      Navigation.isCurrentPanel.withArgs('thread-list').returns(true);
      InboxView.startEdit();
    });

    test('Exit edit mode (Thread or Message) ', function() {
      InboxView.beforeLeave();
      assert.isFalse(mainWrapper.classList.contains('edit'));
    });
  });

  suite('click handling,', function() {
    var thread1, thread2;
    setup(function() {
      this.sinon.stub(Navigation, 'toPanel');
      insertMockMarkup(new Date(2013, 1, 1));

      thread1 = document.getElementById('thread-1');
      thread2 = document.getElementById('thread-2');
    });

    teardown(function() {
      InboxView.inEditMode = false;
    });

    test('clicking on a list item', function() {
      InboxView.inEditMode = false;
      thread1.querySelector('a').click();

      sinon.assert.calledWith(Navigation.toPanel, 'thread', { id: 1 });
    });

    test('clicking on a list item in edit mode', function() {
      InboxView.inEditMode = true;
      thread1.querySelector('label').click();

      sinon.assert.notCalled(Navigation.toPanel);
      assert.ok(thread1.querySelector('input').checked);
    });
  });

  suite('contextmenu handling > Long press on the thread', function() {
    var draft,
        threads = [{
          id: 1,
          date: new Date(2013, 1, 2),
          unread: true
        }, {
          id: 2,
          date: new Date(2013, 1, 0),
          unread: false
        }];

    setup(function(done) {
      this.sinon.stub(MessageManager, 'markThreadRead');
      this.sinon.stub(InboxView, 'delete');

      threads.forEach((threadInfo) => {
        var thread = Thread.create(MockMessages.sms({
          threadId: threadInfo.id,
          timestamp: +threadInfo.date
        }), { unread: threadInfo.unread });
        Threads.set(thread.id, thread);
        InboxView.appendThread(thread);
      });

      draft = new Draft({
        id: 101,
        threadId: null,
        recipients: [],
        content: ['An explicit id'],
        timestamp: Date.now(),
        type: 'sms'
      });

      Drafts.add(draft);

      this.sinon.stub(Drafts, 'request').returns(
        Promise.resolve([draft])
      );

      InboxView.renderDrafts().then(done, done);
    });

    teardown(function() {
      InboxView.inEditMode = false;
      Drafts.clear();
    });

    //mark as read action on thread
    test(' "long-press" on thread having unread message', function() {
      var firstThreadNode = document.getElementById('thread-1');
      var contextMenuEvent = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true
      });

      firstThreadNode.querySelector('a').dispatchEvent(contextMenuEvent);
      var item = MockOptionMenu.calls[0].items[1];
      item.method.apply(null, item.params);

      assert.equal(MockOptionMenu.calls.length, 1);
      assert.equal(
        MockOptionMenu.calls[0].items[0].l10nId, 'delete-thread'
      );
      assert.equal(
        MockOptionMenu.calls[0].items[1].l10nId, 'mark-as-read'
      );
      assert.equal(
        MockOptionMenu.calls[0].items[2].l10nId, 'cancel'
      );
      sinon.assert.calledWith(MessageManager.markThreadRead, 1, true);
    });

    //mark as unread action on thread
    test(' "long-press" on thread having read message', function() {
      var secondThreadNode = document.getElementById('thread-2');
      var contextMenuEvent = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true
      });

      secondThreadNode.querySelector('a').dispatchEvent(contextMenuEvent);
      var item = MockOptionMenu.calls[0].items[1];
      item.method.apply(null, item.params);

      assert.ok(MockOptionMenu.calls.length, 1);
      assert.equal(
        MockOptionMenu.calls[0].items[0].l10nId, 'delete-thread'
      );
      assert.equal(
        MockOptionMenu.calls[0].items[1].l10nId, 'mark-as-unread'
      );
      assert.equal(
        MockOptionMenu.calls[0].items[2].l10nId, 'cancel'
      );
      sinon.assert.calledWith(MessageManager.markThreadRead, 2, false);
    });

    //delete action on thread
    test(' "long-press" on thread & delete action', function() {
      var secondThreadNode = document.getElementById('thread-2');
      var contextMenuEvent = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true
      });

      secondThreadNode.querySelector('a').dispatchEvent(contextMenuEvent);
      var item = MockOptionMenu.calls[0].items[0];
      item.method.apply(null, item.params);

      assert.ok(MockOptionMenu.calls.length, 1);
      assert.equal(
        MockOptionMenu.calls[0].items[0].l10nId, 'delete-thread'
      );
      assert.equal(
        MockOptionMenu.calls[0].items[1].l10nId, 'mark-as-unread'
      );
      assert.equal(
        MockOptionMenu.calls[0].items[2].l10nId, 'cancel'
      );
      sinon.assert.calledWith(InboxView.delete, ['2']);
    });

    //delete action on draft-thread & mark-as-read/unread not available
    test(' "long-press" on Draft & delete action',function() {
      var firstThreadDraftNode = document.querySelector('#thread-101 a');
      var contextMenuEvent = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true
      });

      firstThreadDraftNode.dispatchEvent(contextMenuEvent);
      var item = MockOptionMenu.calls[0].items[0];
      item.method.apply(null, item.params);

      assert.ok(MockOptionMenu.calls.length, 1);
      assert.equal(
        MockOptionMenu.calls[0].items[0].l10nId, 'delete-thread'
      );
      assert.notEqual(
        MockOptionMenu.calls[0].items[1].l10nId, 'mark-as-read'
      );
      assert.notEqual(
        MockOptionMenu.calls[0].items[1].l10nId, 'mark-as-unread'
      );
      assert.equal(
        MockOptionMenu.calls[0].items[1].l10nId, 'cancel'
      );
      sinon.assert.calledWith(InboxView.delete, ['101']);
    });
  });

  suite('whenReady', function() {
    test('only resolves when all threads are rendered', function(done) {
      this.sinon.stub(MessageManager, 'getThreads');

      var firstPageRenderedStub = sinon.stub();
      var allThreadsRenderedStub = sinon.stub();

      InboxView.renderThreads(firstPageRenderedStub).then(
        allThreadsRenderedStub
      );

      var threadList = new MockThreadList({ fullList: true });
      threadList.forEach(
        (thread) => MessageManager.getThreads.yieldTo('each', thread)
      );
      MessageManager.getThreads.yieldTo('end');
      MessageManager.getThreads.yieldTo('done');

      InboxView.whenReady().then(() => {
        sinon.assert.callOrder(firstPageRenderedStub, allThreadsRenderedStub);
      }).then(done, done);
    });
  });
});
