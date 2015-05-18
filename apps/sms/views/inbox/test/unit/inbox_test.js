/*global MocksHelper, loadBodyHTML, MockL10n, InboxView,
         MessageManager, WaitingScreen, Threads, Template, MockMessages,
         MockThreadList, MockTimeHeaders, Draft, Drafts, Thread,
         MockOptionMenu, Utils, Contacts, MockContact, Navigation,
         MockSettings, Settings,
         InterInstanceEventDispatcher,
         MockStickyHeader,
         StickyHeader
         */

'use strict';

require('/views/shared/js/utils.js');
require('/views/inbox/js/inbox.js');

require('/shared/test/unit/mocks/mock_async_storage.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/views/shared/test/unit/mock_contact.js');
require('/views/shared/test/unit/mock_contacts.js');
require('/views/shared/test/unit/mock_time_headers.js');
require('/services/test/unit/mock_message_manager.js');
require('/views/shared/test/unit/mock_messages.js');
require('/views/shared/test/unit/mock_utils.js');
require('/views/shared/test/unit/mock_waiting_screen.js');
require('/shared/test/unit/mocks/mock_contact_photo_helper.js');
require('/views/shared/test/unit/thread_list_mockup.js');
require('/views/shared/test/unit/utils_mockup.js');
require('/shared/test/unit/mocks/mock_option_menu.js');
require('/shared/test/unit/mocks/mock_sticky_header.js');
require('/views/shared/test/unit/mock_navigation.js');
require('/views/shared/test/unit/mock_settings.js');
require('/views/shared/test/unit/mock_inter_instance_event_dispatcher.js');
require('/views/shared/test/unit/mock_selection_handler.js');
require('/services/test/unit/mock_drafts.js');
require('/services/test/unit/mock_threads.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');

var mocksHelperForInboxView = new MocksHelper([
  'asyncStorage',
  'Contacts',
  'MessageManager',
  'Utils',
  'WaitingScreen',
  'TimeHeaders',
  'ContactPhotoHelper',
  'OptionMenu',
  'StickyHeader',
  'Navigation',
  'InterInstanceEventDispatcher',
  'SelectionHandler',
  'LazyLoader',
  'Settings',
  'Drafts',
  'Draft',
  'Threads',
  'Thread'
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
    this.sinon.stub(Drafts, 'on');

    InboxView.readyDeferred = Utils.Promise.defer();
    InboxView.init();
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
  });

  suite('updateThread', function() {
    setup(function() {
      this.sinon.stub(Thread, 'create');
      this.sinon.stub(Threads, 'get');
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
      InboxView.container.innerHTML = '';
    });

    suite(' > in empty welcome screen,', function() {
      var message, thread;

      setup(function() {
        message = MockMessages.sms();

        thread = new Thread({
          id: message.threadId,
          participants: [message.sender]
        });

        Thread.create.returns(thread);
        Threads.get.withArgs(thread.id).returns(thread);

        InboxView.updateThread(message);
      });

      test('setEmpty & appended', function() {
        sinon.assert.calledOnce(InboxView.setEmpty);

        sinon.assert.calledWithMatch(InboxView.appendThread, thread);
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
          id: 1,
          threadId: 2,
          timestamp: +nextDate
        });

        var thread = new Thread({
          id: message.threadId,
          participants: [message.sender]
        });

        Thread.create.withArgs(message).returns(thread);
        Threads.get.withArgs(thread.id).returns(thread);

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
          id: 2,
          threadId: 20,
          timestamp: +newDate
        });

        var newThread = new Thread({
          id: newMessage.threadId,
          participants: [newMessage.sender]
        });

        Thread.create.withArgs(newMessage).returns(newThread);
        Threads.get.withArgs(newThread.id).returns(newThread);

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
          id: 3,
          threadId: 3,
          timestamp: +sameDate
        });

        var newThread = new Thread({
          id: newMessage.threadId,
          participants: [newMessage.sender]
        });

        Thread.create.withArgs(newMessage).returns(newThread);
        Threads.get.withArgs(newThread.id).returns(newThread);

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

        thread = new Thread({
          id: message.threadId,
          participants: [message.sender]
        });

        Thread.create.withArgs(message).returns(thread);
        Threads.get.withArgs(thread.id).returns(thread);

        InboxView.updateThread(message);
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

        thread = new Thread({
          id: message.threadId,
          participants: [message.sender]
        });

        Thread.create.withArgs(message).returns(thread);
        Threads.get.withArgs(thread.id).returns(thread);

        InboxView.updateThread(message);
      });

      test('new thread is appended', function() {
        sinon.assert.calledOnce(InboxView.appendThread);
        // first call, first argument
        sinon.assert.calledWith(InboxView.appendThread, thread);
      });

      test('no thread is removed', function() {
        sinon.assert.notCalled(InboxView.removeThread);
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

        var thread = new Thread({
          id: message.threadId,
          participants: [message.sender],
          timestamp: message.timestamp
        });

        Thread.create.withArgs(message).returns(thread);
        Threads.get.withArgs(thread.id).returns(thread);

        InboxView.updateThread(message, { unread: true });
      });

      test('no new thread is appended', function() {
        sinon.assert.notCalled(InboxView.appendThread);
      });

      test('no old thread is removed', function() {
        sinon.assert.notCalled(InboxView.removeThread);
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

        var thread = new Thread({
          id: message.threadId,
          participants: [message.sender],
          timestamp: message.timestamp
        });

        Thread.create.withArgs(message).returns(thread);

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

        var thread = new Thread({
          id: message.threadId,
          participants: [message.sender],
          timestamp: message.timestamp
        });

        Thread.create.withArgs(message).returns(thread);
        Threads.get.withArgs(thread.id).returns(thread);

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
      var firstThread, secondThread;
      setup(function() {
        firstThread = new Thread({
          id: 1,
          participants: ['555'],
          lastMessageType: 'sms',
          body: 'Hello 555',
          timestamp: Date.now(),
          unreadCount: 0
        });

        secondThread = new Thread({
          id: 2,
          participants: ['666'],
          lastMessageType: 'sms',
          body: 'Hello 666',
          timestamp: Date.now(),
          unreadCount: 0
        });

        Thread.create.withArgs(firstThread).returns(firstThread);
        Threads.get.withArgs(firstThread.id).returns(firstThread);

        Thread.create.withArgs(secondThread).returns(secondThread);
        Threads.get.withArgs(secondThread.id).returns(secondThread);
      });

      test('Threads.set is called', function() {
        InboxView.updateThread(firstThread);

        sinon.assert.calledOnce(Threads.set);
      });

      test('Threads.set is called even id has no match', function() {
        InboxView.updateThread(secondThread);

        sinon.assert.calledOnce(Threads.set);
      });
    });
  });

  suite('markReadUnread', function() {
    setup(function() {
      this.sinon.stub(Threads, 'get');

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

      threads.forEach((threadInfo, index) => {
        var message = MockMessages.sms({
          id: index,
          threadId: threadInfo.id,
          timestamp: +threadInfo.date
        });

        var thread = new Thread({
          id: message.threadId,
          timestamp: message.timestamp,
          unreadCount: threadInfo.unread ? 1 : 0,
          participants: [message.sender]
        });
        Threads.get.withArgs(sinon.match(thread.id)).returns(thread);
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
      this.sinon.stub(Drafts, 'byDraftId');
      this.sinon.stub(Threads, 'get');
      this.sinon.stub(Threads, 'has');
      this.sinon.stub(Threads, 'delete');

      var drafts = threadDraftIds.map((id) => {
        var draft = new Draft({
          id: id,
          threadId: id,
          recipients: [],
          content: ['An explicit id'],
          timestamp: Date.now(),
          type: 'sms'
        });

        var thread = new Thread({
          id: draft.id,
          timestamp: draft.timestamp,
          participants: [],
          isDraft: true
        });

        this.sinon.stub(thread, 'getDraft').returns(draft);

        Threads.get.withArgs(draft.id).returns(thread);
        Threads.has.withArgs(draft.id).returns(true);

        Drafts.byDraftId.withArgs(draft.id).returns(draft);

        return thread;
      });

      var threads = threadIds.map((id) => {
        var message = MockMessages.sms({
          threadId: id,
          timestamp: Date.now()
        });

        var thread = new Thread({
          id: message.threadId,
          participants: [message.sender],
          timestamp: message.timestamp
        });

        Threads.get.withArgs(thread.id).returns(thread);
        Threads.has.withArgs(thread.id).returns(true);

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
          threadDraftIds.forEach((id) => {
            assert.isNotNull(document.getElementById(`thread-${id}`));
          });

          selectThreadsAndDelete(threadDraftIds).then(done, done);
        });

        test('removes thread draft from the DOM', function() {
          sinon.assert.called(WaitingScreen.show);

          threadDraftIds.forEach((id) => {
            sinon.assert.calledWith(Threads.delete, id);
          });

          assert.isNull(document.getElementById('thread-100'));
          assert.isNull(document.getElementById('thread-200'));

          sinon.assert.called(WaitingScreen.hide);
          sinon.assert.notCalled(MessageManager.getMessages);
          sinon.assert.notCalled(MessageManager.deleteMessages);
        });
      });

      suite('delete real threads only', function() {
        var threadsToDelete = threadIds.slice(0, 2);

        setup(function(done) {
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
            sinon.assert.calledWith(Threads.delete, threadId);
            sinon.assert.calledWith(
              Utils.closeNotificationsForThread, threadId
            );
          });

          sinon.assert.called(WaitingScreen.hide);
        });
      });

      suite('delete both real threads and drafts', function() {
        var threadsToDelete = threadDraftIds.concat(threadIds);

        setup(function(done) {
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
            sinon.assert.calledWith(Threads.delete, id);
          });

          assert.isNotNull(document.getElementById('thread-1'));
          assert.isNotNull(document.getElementById('thread-2'));
          assert.isNotNull(document.getElementById('thread-3'));
          assert.isNull(document.getElementById('thread-100'));
          assert.isNull(document.getElementById('thread-200'));

          // Don't hide waiting screen until full deletion is finished
          sinon.assert.notCalled(WaitingScreen.hide);

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
            sinon.assert.calledWith(Threads.delete, id);
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

    test('escapes the body for SMS', function() {
      var smsThread = new Thread({
        id: 1,
        lastMessageType: 'sms',
        participants: ['1234'],
        body: 'hello <a href="world">world</a>',
        timestamp: Date.now()
      });

      InboxView.createThread(smsThread);

      sinon.assert.calledWith(Template.escape, smsThread.body);
      sinon.assert.called(MockTimeHeaders.update);
    });

    test('escapes the body for MMS', function() {
      var mmsThread = new Thread({
        id: 1,
        lastMessageType: 'mms',
        participants: ['1234', '5678'],
        body: 'hello <a href="world">world</a>',
        timestamp: Date.now()
      });

      InboxView.createThread(mmsThread);

      sinon.assert.calledWith(Template.escape, mmsThread.body);
      sinon.assert.called(MockTimeHeaders.update);
    });

    suite('Correctly displayed content', function() {
      var now, message, thread, li;

      setup(function() {
        now = Date.now();

        message = MockMessages.sms({
          delivery: 'delivered',
          threadId: 1,
          timestamp: now,
          body: 'from a message'
        });

        thread = new Thread({
          id: message.threadId,
          timestamp: message.timestamp,
          participants: [message.receiver],
          body: message.body,
          lastMessageType: message.type
        });

        this.sinon.stub(Threads, 'get').withArgs(thread.id).returns(thread);
      });

      test('Message newer than draft is used', function() {
        this.sinon.stub(thread, 'getDraft').returns({
          timestamp: now - 60000,
          content: ['from a draft']
        });

        li = InboxView.createThread(thread);

        assert.equal(
          li.querySelector('.body-text').textContent, 'from a message'
        );
      });

      test('Draft newer than content is used', function() {
        this.sinon.stub(thread, 'getDraft').returns({
          timestamp: now + 60000,
          content: ['from a draft']
        });

        li = InboxView.createThread(thread);

        assert.equal(
          li.querySelector('.body-text').textContent, 'from a draft'
        );
      });

      test('Draft newer, but has no content', function() {
        this.sinon.stub(thread, 'getDraft').returns({
          timestamp: now + 60000,
          content: []
        });

        li = InboxView.createThread(thread);

        assert.equal(
          li.querySelector('.body-text').textContent, ''
        );
      });

      test('Last message type for draft', function() {
        this.sinon.stub(thread, 'getDraft').returns({
           timestamp: now,
          content: [],
          type: 'mms'
        });

        li = InboxView.createThread(thread);

        assert.ok(li.dataset.lastMessageType, 'mms');
      });
    });
  });

  suite('onMessageReceived >', function() {
    var firstMessage, secondMessage;

    setup(function() {
      this.sinon.spy(InboxView, 'updateThread');
      this.sinon.stub(InboxView, 'setContact');
      this.sinon.stub(Thread, 'create');

      firstMessage = MockMessages.sms({
        id: 100,
        threadId: 1
      });

      secondMessage = MockMessages.sms({
        id: 200,
        threadId: 1
      });

      [firstMessage, secondMessage].forEach((message) => {
        Thread.create.withArgs(message).returns(new Thread({
          id: message.threadId,
          participants: [message.sender]
        }));
      });
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
      this.sinon.stub(Thread, 'create');

      firstMessage = MockMessages.sms({
        id: 100,
        threadId: 1
      });

      secondMessage = MockMessages.sms({
        id: 200,
        threadId: 1
      });

       [firstMessage, secondMessage].forEach((message) => {
        Thread.create.withArgs(message).returns(new Thread({
          id: message.threadId,
          participants: [message.sender]
        }));
      });
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
      this.sinon.stub(Threads, 'get');
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

        thread = new Thread({
          id: message.threadId,
          timestamp: message.timestamp,
          participants: [message.sender]
        });

        Threads.get.withArgs(message.threadId).returns(thread);
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

        thread = new Thread({
          id: message.threadId,
          timestamp: message.timestamp,
          participants: [message.sender]
        });

        Threads.get.withArgs(message.threadId).returns(thread);

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

        thread = new Thread({
          id: message.threadId,
          timestamp: message.timestamp,
          participants: [message.sender]
        });

        Threads.get.withArgs(message.threadId).returns(thread);
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
        var message = MockMessages.sms({
          threadId: 3,
          timestamp: +(new Date(2013, 1, 2))
        });

        var thread = new Thread({
          id: message.threadId,
          timestamp: message.timestamp,
          participants: [message.sender]
        });

        Threads.get.withArgs(message.threadId).returns(thread);

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
        this.sinon.stub(Threads, 'set');
        threadList = new MockThreadList();

        this.sinon.stub(MessageManager, 'getThreads', (options) => {
          threadList.forEach((thread) => options.each && options.each(thread));

          options.end && options.end();
          options.done && options.done();
        });
      });

      test('Sets every thread to Threads object', function(done) {
        InboxView.renderThreads(() => {
          threadList.forEach((thread) => {
            sinon.assert.calledWith(Threads.set, thread.id);
          });
        }).then(done, done);
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
      this.sinon.spy(Drafts, 'request');
      this.sinon.stub(Drafts, 'getAll');
      this.sinon.stub(Drafts, 'byDraftId');
      this.sinon.stub(Drafts, 'byThreadId');
      this.sinon.stub(Threads, 'get');
      this.sinon.stub(Thread, 'create');

      var someDate = new Date(2013, 1, 1).getTime();
      insertMockMarkup(someDate);

      var nextDate = new Date(2013, 1, 2);
      var message = MockMessages.sms({
        threadId: 3,
        timestamp: +nextDate
      });

      thread = new Thread({
        id: message.threadId,
        timestamp: message.timestamp,
        participants: [message.sender]
      });
      Thread.create.withArgs(thread).returns(thread);
      Threads.get.withArgs(thread.id).returns(thread);

      InboxView.appendThread(thread);

      threadDraft = new Draft({
        id: 102,
        threadId: 3,
        recipients: [],
        content: ['An explicit id'],
        timestamp: Date.now(),
        type: 'sms'
      });
      this.sinon.stub(thread, 'getDraft').returns(threadDraft);

      draft = new Draft({
        id: 101,
        threadId: null,
        recipients: [],
        content: ['An explicit id'],
        timestamp: Date.now(),
        type: 'sms'
      });

      var draftThread = new Thread({
        id: draft.id,
        timestamp: draft.timestamp,
        participants: [],
        isDraft: true
      });
      this.sinon.stub(draftThread, 'getDraft').returns(draft);

      Thread.create.withArgs(draft).returns(draftThread);
      Threads.get.withArgs(draft.id).returns(draftThread);

      Drafts.byDraftId.withArgs(draft.id).returns(draft);
      Drafts.getAll.returns([threadDraft, draft]);

      InboxView.renderDrafts().then(done, done);
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

    test('should re-request drafts if they are changed by another app instance',
    function() {
      InterInstanceEventDispatcher.on.withArgs('drafts-changed').yield();

      sinon.assert.calledWith(Drafts.request, true);
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
      this.sinon.stub(Threads, 'get');

      realWindowInnerHeight = Object.getOwnPropertyDescriptor(
        window, 'innerWidth'
      );

      var oneToOneThread = new Thread({
        id: 1,
        participants: ['555'],
        lastMessageType: 'sms',
        body: 'Hello 555',
        timestamp: Date.now(),
        unreadCount: 0
      });

      var oneToManyThread = new Thread({
        id: 2,
        participants: ['555', '666'],
        lastMessageType: 'mms',
        body: 'Hello 555',
        timestamp: Date.now(),
        unreadCount: 0
      });

      Threads.get.withArgs(oneToOneThread.id).returns(oneToOneThread);
      Threads.get.withArgs(oneToManyThread.id).returns(oneToManyThread);

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
          groupThread.picture.style.backgroundImage.includes('blob:')
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
          groupThread.picture.style.backgroundImage.includes('blob:')
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
      this.sinon.stub(Threads, 'get');

      var thread = new Thread({
        id: 1,
        participants: ['a@b.com'],
        lastMessageType: 'mms',
        body: 'Hello a@b.com',
        timestamp: Date.now(),
        unreadCount: 0
      });

      Threads.get.withArgs(thread.id).returns(thread);

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

  suite('beforeEnter()', function() {
    setup(function() {
      this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
      Navigation.isCurrentPanel.withArgs('thread-list').returns(true);
      this.sinon.useFakeTimers();
    });

    test('Shows draft saved banner only if requested', function() {
      InboxView.beforeEnter({});

      assert.isTrue(draftSavedBanner.classList.contains('hide'));

      InboxView.beforeEnter({ notifyAboutSavedDraft: false });

      assert.isTrue(draftSavedBanner.classList.contains('hide'));

      InboxView.beforeEnter({ notifyAboutSavedDraft: true });

      assert.isFalse(draftSavedBanner.classList.contains('hide'));

      this.sinon.clock.tick(InboxView.DRAFT_SAVED_DURATION - 1);
      assert.isFalse(draftSavedBanner.classList.contains('hide'));

      this.sinon.clock.tick(1);
      assert.isTrue(draftSavedBanner.classList.contains('hide'));
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
    var thread1, thread2, draft1;
    setup(function(done) {
      this.sinon.stub(Navigation, 'toPanel');
      this.sinon.stub(Drafts, 'getAll');
      this.sinon.stub(Drafts, 'byDraftId');
      this.sinon.stub(Thread, 'create');
      this.sinon.stub(Threads, 'get');

      insertMockMarkup(new Date(2013, 1, 1));

      var draft = new Draft({
        id: 101,
        threadId: null,
        recipients: [],
        content: ['An explicit id'],
        timestamp: Date.now(),
        type: 'sms'
      });

      var thread = new Thread({
        id: draft.id,
        timestamp: draft.timestamp,
        participants: [],
        isDraft: true
      });
      this.sinon.stub(thread, 'getDraft').returns(draft);

      Drafts.byDraftId.withArgs(draft.id).returns(draft);
      Drafts.getAll.returns([draft]);
      Thread.create.withArgs(draft).returns(thread);
      Threads.get.withArgs(thread.id).returns(thread);

      InboxView.renderDrafts().then(() => {
        thread1 = document.getElementById('thread-1');
        thread2 = document.getElementById('thread-2');
        draft1 = document.getElementById('thread-101');
      }).then(done, done);
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

    test('click on draft', function() {
      draft1.querySelector('label').click();

      sinon.assert.calledWith(Navigation.toPanel, 'composer', { draftId: 101 });
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
      this.sinon.stub(Drafts, 'getAll');
      this.sinon.stub(Drafts, 'byDraftId');
      this.sinon.stub(Threads, 'get');
      this.sinon.stub(Thread, 'create');

      threads.forEach((threadInfo) => {
        var message = MockMessages.sms({
          threadId: threadInfo.id,
          timestamp: +threadInfo.date
        });

        var thread = new Thread({
          id: message.threadId,
          timestamp: message.timestamp,
          participants: [message.sender],
          unreadCount: threadInfo.unread ? 1 : 0,
        });

        Threads.get.withArgs(thread.id).returns(thread);

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

      var draftThread = new Thread({
        id: draft.id,
        timestamp: draft.timestamp,
        participants: [],
        isDraft: true
      });
      this.sinon.stub(draftThread, 'getDraft').returns(draft);

      Drafts.byDraftId.withArgs(draft.id).returns(draft);
      Drafts.getAll.returns([draft]);

      Thread.create.withArgs(draft).returns(draftThread);
      Threads.get.withArgs(draftThread.id).returns(draftThread);

      InboxView.renderDrafts().then(done, done);
    });

    teardown(function() {
      InboxView.inEditMode = false;
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

  suite('onDraftSaved', function() {
    var realThread, threadFromDraft, threadLessDraft;

    setup(function() {
      this.sinon.stub(Threads, 'get');
      this.sinon.stub(Thread, 'create');
      this.sinon.stub(Drafts, 'byDraftId');

      threadLessDraft = new Draft({
        id: 100,
        timestamp: Date.now(),
        type: 'sms',
        content: ['old draft content']
      });
      Drafts.byDraftId.withArgs(threadLessDraft.id).returns(threadLessDraft);

      threadFromDraft = new Thread({
        id: threadLessDraft.id,
        timestamp: threadLessDraft.timestamp,
        participants: [],
        lastMessageType: threadLessDraft.type,
        body: threadLessDraft.content[0],
        isDraft: true
      });

      realThread = new Thread({
        id: 1,
        timestamp: Date.now(),
        participants: ['+1'],
        lastMessageType: 'sms',
        body: 'thread content'
      });

      [realThread, threadFromDraft].forEach((thread) => {
        Threads.get.withArgs(thread.id).returns(thread);
        Thread.create.withArgs(
          thread.isDraft ? threadLessDraft : thread
        ).returns(thread);

        this.sinon.stub(thread, 'getDraft').returns(
          thread.isDraft ? threadLessDraft : null
        );

        InboxView.appendThread(thread);

        var threadNode = document.getElementById('thread-' + thread.id);
        assert.equal(
          threadNode.querySelector('.body-text').textContent, thread.body
        );
        assert.equal(
          threadNode.dataset.lastMessageType, thread.lastMessageType
        );
      });
    });

    test('updates thread if thread draft is updated', function() {
      var threadDraft = new Draft({
        id: 101,
        threadId: realThread.id,
        content: ['draft content'],
        type: 'mms',
        timestamp: realThread.timestamp + 600
      });
      realThread.getDraft.returns(threadDraft);

      Drafts.on.withArgs('saved').yield(threadDraft);

      var threadNode = document.getElementById('thread-' + realThread.id);
      assert.equal(
        threadNode.querySelector('.body-text').textContent,
        threadDraft.content[0]
      );
      assert.equal(threadNode.dataset.lastMessageType, threadDraft.type);
    });

    test('updates thread-less draft if it is updated', function() {
      var newDraft = new Draft({
        id: threadLessDraft.id,
        content: ['new draft content'],
        type: 'mms',
        timestamp: threadLessDraft.timestamp + 600
      });

      threadFromDraft.getDraft.returns(newDraft);
      Thread.create.withArgs(newDraft).returns(new Thread({
        id: newDraft.id,
        timestamp: newDraft.timestamp,
        participants: [],
        lastMessageType: newDraft.type,
        body: newDraft.content[0],
        isDraft: true
      }));

      Drafts.on.withArgs('saved').yield(newDraft);

      var threadNode = document.getElementById('thread-' + threadFromDraft.id);
      assert.equal(
        threadNode.querySelector('.body-text').textContent,
        newDraft.content[0]
      );
      assert.equal(threadNode.dataset.lastMessageType, newDraft.type);
    });
  });

  suite('onDraftDeleted', function() {
    var realThread, threadFromDraft, threadLessDraft, threadDraft;

    setup(function() {
      this.sinon.stub(Threads, 'get');
      this.sinon.stub(Thread, 'create');
      this.sinon.stub(Drafts, 'byDraftId');

      threadLessDraft = new Draft({
        id: 100,
        timestamp: Date.now(),
        type: 'sms',
        content: ['draft content']
      });
      Drafts.byDraftId.withArgs(threadLessDraft.id).returns(threadLessDraft);

      threadFromDraft = new Thread({
        id: threadLessDraft.id,
        timestamp: threadLessDraft.timestamp,
        participants: [],
        lastMessageType: threadLessDraft.type,
        body: threadLessDraft.content[0],
        isDraft: true
      });

      realThread = new Thread({
        id: 1,
        timestamp: Date.now(),
        participants: ['+1'],
        lastMessageType: 'sms',
        body: 'thread content'
      });

      threadDraft = new Draft({
        id: 101,
        threadId: realThread.id,
        timestamp: Date.now() + 600,
        type: 'sms',
        content: ['thread draft content']
      });

      [realThread, threadFromDraft].forEach((thread) => {
        Threads.get.withArgs(thread.id).returns(thread);
        Thread.create.withArgs(
          thread.isDraft ? threadLessDraft : thread
        ).returns(thread);

        var draft = thread.isDraft ? threadLessDraft : threadDraft;

        this.sinon.stub(thread, 'getDraft').returns(draft);

        InboxView.appendThread(thread);

        var threadNode = document.getElementById('thread-' + thread.id);
        assert.equal(
          threadNode.querySelector('.body-text').textContent, draft.content[0]
        );
        assert.equal(
          threadNode.dataset.lastMessageType, draft.type
        );
      });
    });

    test('removes draft from the thread', function() {
      realThread.getDraft.returns(null);

      Drafts.on.withArgs('deleted').yield(threadDraft);

      var threadNode = document.getElementById('thread-' + realThread.id);
      assert.equal(
        threadNode.querySelector('.body-text').textContent,
        realThread.body
      );
      assert.equal(
        threadNode.dataset.lastMessageType, realThread.lastMessageType
      );
    });

    test('removes thread-less draft entirely', function() {
      Drafts.on.withArgs('deleted').yield(threadLessDraft);

      assert.isNull(document.getElementById('thread-' + threadFromDraft.id));
    });
  });
});
