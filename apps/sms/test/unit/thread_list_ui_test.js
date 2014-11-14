/*global mocha, MocksHelper, loadBodyHTML, MockL10n, ThreadListUI,
         MessageManager, WaitingScreen, Threads, Template, MockMessages,
         MockThreadList, MockTimeHeaders, Draft, Drafts, Thread, ThreadUI,
         MockOptionMenu, Utils, Contacts, MockContact, Navigation, MockDialog,
         MockSettings,
         MockStickyHeader,
         StickyHeader
         */

'use strict';

// remove this when https://github.com/visionmedia/mocha/issues/819 is merged in
// mocha and when we have that new mocha in test agent
mocha.setup({ globals: ['alert', 'confirm'] });

requireApp('sms/js/utils.js');
requireApp('sms/js/recipients.js');
requireApp('sms/js/drafts.js');
requireApp('sms/js/threads.js');
requireApp('sms/js/thread_list_ui.js');

require('/shared/test/unit/mocks/mock_async_storage.js');
require('/shared/test/unit/mocks/mock_l10n.js');
requireApp('sms/test/unit/mock_contact.js');
requireApp('sms/test/unit/mock_contacts.js');
requireApp('sms/test/unit/mock_time_headers.js');
requireApp('sms/test/unit/mock_message_manager.js');
requireApp('sms/test/unit/mock_messages.js');
requireApp('sms/test/unit/mock_utils.js');
requireApp('sms/test/unit/mock_dialog.js');
requireApp('sms/test/unit/mock_waiting_screen.js');
require('/shared/test/unit/mocks/mock_contact_photo_helper.js');
require('/test/unit/thread_list_mockup.js');
require('/test/unit/utils_mockup.js');
requireApp('sms/test/unit/mock_thread_ui.js');
require('/shared/test/unit/mocks/mock_option_menu.js');
require('/shared/test/unit/mocks/mock_performance_testing_helper.js');
require('/shared/test/unit/mocks/mock_sticky_header.js');
require('/test/unit/mock_navigation.js');
require('/test/unit/mock_settings.js');

var mocksHelperForThreadListUI = new MocksHelper([
  'asyncStorage',
  'Contacts',
  'MessageManager',
  'Utils',
  'Dialog',
  'WaitingScreen',
  'TimeHeaders',
  'ThreadUI',
  'ContactPhotoHelper',
  'OptionMenu',
  'PerformanceTestingHelper',
  'StickyHeader',
  'Navigation'
]).init();

suite('thread_list_ui', function() {
  var nativeMozL10n = navigator.mozL10n;
  var draftSavedBanner;
  var mainWrapper;

  mocksHelperForThreadListUI.attachTestHelpers();
  setup(function() {
    loadBodyHTML('/index.html');
    navigator.mozL10n = MockL10n;
    draftSavedBanner = document.getElementById('threads-draft-saved-banner');
    mainWrapper = document.getElementById('main-wrapper');

    this.sinon.stub(MessageManager, 'on');

    ThreadListUI.init();

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

    ThreadListUI.container.innerHTML = markup;
  }

  suite('delayed rendering loops', function() {

    suite('multiple render calls', function() {
      var appendThread;
      var appendCallCount;

      suiteSetup(function() {
        appendThread = ThreadListUI.appendThread;
        ThreadListUI.appendThread = function(thread) {
          appendCallCount++;
          assert.ok(thread.okay);
        };
      });

      suiteTeardown(function() {
        ThreadListUI.appendThread = appendThread;
      });

      setup(function() {
        appendCallCount = 0;
      });

    });

  });

  suite('setEmpty', function() {
    suite('(true)', function() {
      setup(function() {
        // set wrong states
        ThreadListUI.noMessages.classList.add('hide');
        ThreadListUI.container.classList.remove('hide');
        // make sure it sets em all
        ThreadListUI.setEmpty(true);
      });
      test('removes noMessages hide', function() {
        assert.isFalse(ThreadListUI.noMessages.classList.contains('hide'));
      });
      test('adds container hide', function() {
        assert.isTrue(ThreadListUI.container.classList.contains('hide'));
      });
    });
    suite('(false)', function() {
      setup(function() {
        // set wrong states
        ThreadListUI.noMessages.classList.remove('hide');
        ThreadListUI.container.classList.add('hide');
        // make sure it sets em all
        ThreadListUI.setEmpty(false);
      });
      test('adds noMessages hide', function() {
        assert.isTrue(ThreadListUI.noMessages.classList.contains('hide'));
      });
      test('removes container hide', function() {
        assert.isFalse(ThreadListUI.container.classList.contains('hide'));
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

    test('show settings/cancel options when list is empty', function() {
      ThreadListUI.setEmpty(true);
      ThreadListUI.showOptions();

      var optionItems = MockOptionMenu.calls[0].items;
      assert.equal(optionItems.length, 2);
      assert.equal(optionItems[0].l10nId, 'settings');
      assert.equal(optionItems[1].l10nId, 'cancel');
    });

    test('show select/settings/cancel options when list existed', function() {
      ThreadListUI.setEmpty(false);
      ThreadListUI.showOptions();

      var optionItems = MockOptionMenu.calls[0].items;
      assert.equal(optionItems.length, 3);
      assert.equal(optionItems[0].l10nId, 'selectThreads-label');
      assert.equal(optionItems[1].l10nId, 'settings');
      assert.equal(optionItems[2].l10nId, 'cancel');
    });
  });

  suite('removeThread', function() {
    setup(function() {
      ThreadListUI.container.innerHTML = '<h2 id="header-1"></h2>' +
        '<ul id="list-1"><li id="thread-1"></li>' +
        '<li id="thread-2" data-photo-url="blob"></li></ul>' +
        '<h2 id="header-2"></h2>' +
        '<ul id="list-2"><li id="thread-3"></li></ul>';

      ThreadListUI.sticky = new MockStickyHeader();
      this.sinon.stub(ThreadListUI.sticky, 'refresh');
      this.sinon.stub(window.URL, 'revokeObjectURL');
    });

    suite('remove last thread in header', function() {
      setup(function() {
        ThreadListUI.removeThread(3);
      });
      test('no need to revoke if photoUrl not exist', function() {
        sinon.assert.notCalled(window.URL.revokeObjectURL);
      });
      test('calls StickyHeader.refresh', function() {
        sinon.assert.called(ThreadListUI.sticky.refresh);
      });
      test('leaves other threads alone', function() {
        assert.ok(ThreadListUI.container.querySelector('#thread-1'));
        assert.ok(ThreadListUI.container.querySelector('#thread-2'));
      });
      test('removes threads', function() {
        assert.ok(!ThreadListUI.container.querySelector('#thread-3'));
      });
      test('removes empty header', function() {
        assert.ok(!ThreadListUI.container.querySelector('#header-2'));
      });
      test('removes empty list', function() {
        assert.ok(!ThreadListUI.container.querySelector('#list-2'));
      });
    });

    suite('remove thread with others in header', function() {
      setup(function() {
        ThreadListUI.removeThread(2);
      });
      test('need to revoke if photoUrl exist', function() {
        sinon.assert.called(window.URL.revokeObjectURL);
      });
      test('no StickyHeader.refresh when not removing a header', function() {
        sinon.assert.notCalled(ThreadListUI.sticky.refresh);
      });
      test('leaves other threads alone', function() {
        assert.ok(ThreadListUI.container.querySelector('#thread-1'));
        assert.ok(ThreadListUI.container.querySelector('#thread-3'));
      });
      test('removes threads', function() {
        assert.ok(!ThreadListUI.container.querySelector('#thread-2'));
      });
      test('retains non-empty header', function() {
        assert.ok(ThreadListUI.container.querySelector('#header-1'));
      });
      test('retains non-empty list', function() {
        assert.ok(ThreadListUI.container.querySelector('#list-1'));
      });
    });

    suite('remove all threads', function() {
      setup(function() {
        this.sinon.stub(ThreadListUI, 'setEmpty');
        ThreadListUI.removeThread(1);
        ThreadListUI.removeThread(2);
        ThreadListUI.removeThread(3);
      });
      test('calls setEmpty(true)', function() {
        assert.ok(ThreadListUI.setEmpty.calledWith(true));
      });
    });

    suite('remove draft links', function() {
      setup(function() {
        this.sinon.stub(ThreadListUI.draftLinks, 'get').returns(1);
        this.sinon.stub(ThreadListUI.draftLinks, 'delete');

        ThreadListUI.removeThread(1);
      });
      test('calls draftLinks.get()', function() {
        assert.isTrue(ThreadListUI.draftLinks.get.called);
      });
      test('calls draftLinks.delete()', function() {
        assert.isTrue(ThreadListUI.draftLinks.delete.called);
      });
    });

    suite('remove draft registry item', function() {
      setup(function() {
        ThreadListUI.draftRegistry = {1: true};
        this.sinon.stub(ThreadListUI.draftLinks, 'get').returns(1);
        this.sinon.stub(ThreadListUI.draftLinks, 'delete');

        ThreadListUI.removeThread(1);
      });
      test('clears draftRegistry', function() {
        assert.isTrue(
          typeof ThreadListUI.draftRegistry[1] === 'undefined'
        );
      });
    });
  });

  suite('updateThread', function() {
    setup(function() {
      this.sinon.spy(Thread, 'create');
      this.sinon.spy(Threads, 'has');
      this.sinon.spy(Threads, 'set');
      this.sinon.spy(ThreadListUI, 'removeThread');
      this.sinon.spy(ThreadListUI, 'appendThread');
      this.sinon.spy(ThreadListUI, 'mark');
      this.sinon.spy(ThreadListUI, 'setEmpty');
      // This is normally created by renderThreads
      ThreadListUI.sticky = new MockStickyHeader();
      this.sinon.spy(ThreadListUI.sticky, 'refresh');
    });

    teardown(function() {
      Threads.clear();
      ThreadListUI.container.innerHTML = '';
    });

    suite(' > in empty welcome screen,', function() {
      var message;
      setup(function() {
        message = MockMessages.sms();
        ThreadListUI.updateThread(message);
      });

      test('setEmpty & appended', function() {
        sinon.assert.calledOnce(ThreadListUI.setEmpty);

        sinon.assert.calledWithMatch(ThreadListUI.appendThread, {
          id: message.threadId,
          body: message.body,
          lastMessageSubject: message.lastMessageSubject,
          lastMessageType: 'sms',
          messages: [],
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

        ThreadListUI.updateThread(message);
      });
      test(' > create is called', function() {
        sinon.assert.calledOnce(Thread.create);
      });

      test(' > removeThread is called', function() {
        sinon.assert.calledOnce(ThreadListUI.removeThread);
        sinon.assert.calledOnce(ThreadListUI.appendThread);
      });

      test(' > new message, new thread.', function() {
        var newDate = new Date(2013, 1, 2);
        var newMessage = MockMessages.sms({
          threadId: 20,
          timestamp: +newDate
        });
        ThreadListUI.updateThread(newMessage, { unread: true });
        // As this is a new message we dont have to remove threads
        // So we have only one removeThread for the first appending
        sinon.assert.calledOnce(ThreadListUI.removeThread);
        // But we have appended twice
        sinon.assert.calledTwice(ThreadListUI.appendThread);
      });

      test('only refreshes StickyHeader with new container', function() {
        var sameDate = new Date(2013, 1, 2);
        var newMessage = MockMessages.sms({
          threadId: 3,
          timestamp: +sameDate
        });
        ThreadListUI.updateThread(newMessage);
        // It had to be called once before during setup() since that created a
        // new container.
        sinon.assert.calledOnce(ThreadListUI.sticky.refresh);
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
        ThreadListUI.updateThread(message);
      });

      teardown(function() {
        message = null;
        thread = null;
      });

      test('new thread is appended/updated', function() {
        sinon.assert.calledOnce(ThreadListUI.appendThread);
        // first call, first argument
        sinon.assert.calledWith(ThreadListUI.appendThread, thread);
      });

      test('old thread is removed', function() {
        sinon.assert.calledOnce(ThreadListUI.removeThread);
        sinon.assert.calledWith(ThreadListUI.removeThread, message.threadId);
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
        ThreadListUI.updateThread(message);
      });

      teardown(function() {
        message = null;
        thread = null;
      });

      test('new thread is appended', function() {
        sinon.assert.calledOnce(ThreadListUI.appendThread);
        // first call, first argument
        sinon.assert.calledWith(ThreadListUI.appendThread, thread);
      });

      test('no thread is removed', function() {
        assert.isFalse(ThreadListUI.removeThread.called);
      });

      test('Refresh the fixed header', function() {
        sinon.assert.called(ThreadListUI.sticky.refresh);
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
        ThreadListUI.updateThread(message, { unread: true });
      });

      test('no new thread is appended', function() {
        assert.isFalse(ThreadListUI.appendThread.called);
      });

      test('no old thread is removed', function() {
        assert.isFalse(ThreadListUI.removeThread.called);
      });

      test('old thread is marked unread', function() {
        sinon.assert.called(ThreadListUI.mark);
        sinon.assert.calledWith(ThreadListUI.mark, message.threadId, 'unread');

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
        ThreadListUI.updateThread(message, { deleted: true });
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
        ThreadListUI.updateThread(message, { deleted: true });
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

      test('Threads.has is called', function() {

        ThreadListUI.updateThread({
          id: 1
        });
        assert.isTrue(Threads.has.calledOnce);
      });

      test('Threads.set is called', function() {
        ThreadListUI.updateThread({
          id: 1
        });
        assert.isTrue(Threads.set.calledOnce);
      });

      test('Threads.set is not called when id has no match', function() {
        ThreadListUI.updateThread({
          id: 2
        });
        assert.isTrue(Threads.has.calledOnce);
        assert.isFalse(Threads.set.calledOnce);
      });
    });
  });

  suite('delete', function() {
    setup(function() {
      this.selectedInputs = [
        {value: 1, dataset: { mode: 'threads'} },
        {value: 2, dataset: { mode: 'threads'} }
      ];

      this.sinon.stub(ThreadListUI, 'getSelectedInputs', function() {
        return this.selectedInputs;
      }.bind(this));
      this.sinon.stub(MessageManager, 'getMessages');
    });

    test('confirm true when threads were unselected in the meantime',
    function() {
      this.sinon.stub(WaitingScreen, 'show');
      this.sinon.stub(WaitingScreen, 'hide');
      this.sinon.spy(ThreadListUI, 'cancelEdit');

      ThreadListUI.delete();

      this.selectedInputs = [];

      MockDialog.triggers.confirm();

      sinon.assert.callOrder(WaitingScreen.show, WaitingScreen.hide);
      sinon.assert.called(ThreadListUI.cancelEdit);
      sinon.assert.notCalled(MessageManager.getMessages);
    });

    suite('confirm true', function() {
      setup(function() {
        this.sinon.stub(WaitingScreen, 'show');
        this.sinon.stub(WaitingScreen, 'hide');
        ThreadListUI.delete();
        MockDialog.triggers.confirm();
      });
      test('called dialog with proper message', function() {
        assert.isTrue(MockDialog.prototype.show.called);
        assert.equal(MockDialog.calls[0].body.l10nId,
                        'deleteThreads-confirmation2');
        assert.equal(MockDialog.calls[0].options.confirm.text.l10nId,
                        'delete', 'right text on button');
        assert.equal(MockDialog.calls[0].options.confirm.className,
                        'danger', 'right styling on button');
      });
      test('dialog confirmed', function() {
        assert.ok(MockDialog.triggers.confirm.called);
        assert.isFalse(MockDialog.triggers.cancel.called);
      });
      test('shows WaitingScreen', function() {
        assert.ok(WaitingScreen.show.called);
      });
      test('called MessageManager.getMessages twice', function() {
        assert.equal(MessageManager.getMessages.args.length, 2);
      });
      suite('getMessages({ each: })', function() {
        setup(function() {
          this.sinon.stub(MessageManager, 'deleteMessages');
          // call the "each" function passed to getMessages with fake message
          MessageManager.getMessages.args[0][0].each({ id: 3 });
        });
        test('MessageManager.deleteMessages called', function() {
          assert.ok(MessageManager.deleteMessages.calledWith(3));
        });
      });
      suite('first getMessages', function() {
        setup(function() {
          this.sinon.stub(Threads, 'delete');
          this.sinon.stub(ThreadListUI, 'removeThread');
          this.sinon.spy(Utils, 'closeNotificationsForThread');

          // call the "end" function passed to getMessages with fake message
          MessageManager.getMessages.args[0][0].end();
        });
        test('is for the right thread', function() {
          assert.equal(
            MessageManager.getMessages.args[0][0].filter.threadId, 2);
        });
        test('end calls removeThread for correct thread', function() {
          assert.equal(ThreadListUI.removeThread.args[0][0], 2);
        });
        test('end calls Threads.delete with correct thread', function() {
          assert.equal(Threads.delete.args[0][0], 2);
        });
        test('end calls closeNotificationsForThread', function() {
          sinon.assert.calledWith(Utils.closeNotificationsForThread, 2);
        });
        test('end doesnt hide waiting screen (yet)', function() {
          assert.isFalse(WaitingScreen.hide.called);
        });
        suite('sencond getMessages', function() {
          setup(function() {
            MessageManager.getMessages.args[1][0].end();
          });
          test('is for the right thread', function() {
            assert.equal(
              MessageManager.getMessages.args[1][0].filter.threadId, 1);
          });
          test('end calls removeThread for correct thread', function() {
            assert.equal(ThreadListUI.removeThread.args[1][0], 1);
          });
          test('end calls Threads.delete with correct thread', function() {
            assert.equal(Threads.delete.args[1][0], 1);
          });
          test('end calls closeNotificationsForThread', function() {
            sinon.assert.calledWith(Utils.closeNotificationsForThread, 1);
          });
          test('end calls hide waiting screen', function() {
            assert.isTrue(WaitingScreen.hide.called);
          });
        });
      });
    });

    test('onThreadsDeleted', function() {
      var threadIds = [3, 4, 5];
      this.sinon.stub(Threads, 'has', (id) => threadIds.indexOf(id) >= 0);

      threadIds.forEach(function(threadId) {
        var thread = Thread.create(MockMessages.sms({
          threadId: threadId,
          timestamp: +(new Date())
        }));

        ThreadListUI.appendThread(thread);

        assert.ok(document.getElementById('thread-' + threadId));
      });

      MessageManager.on.withArgs('threads-deleted').yield({ ids: [3, 4, 6] });

      assert.ok(!document.getElementById('thread-3'));
      assert.ok(!document.getElementById('thread-4'));
      assert.ok(document.getElementById('thread-5'));
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
      return o;
    }

    test('escapes the body for SMS', function() {
      var payload = 'hello <a href="world">world</a>';
      ThreadListUI.createThread(buildSMSThread(payload));
      assert.ok(Template.escape.calledWith(payload));
      assert.ok(MockTimeHeaders.update.called);
    });

    test('escapes the body for MMS', function() {
      var payload = 'hello <a href="world">world</a>';
      ThreadListUI.createThread(buildMMSThread(payload));
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
        li = ThreadListUI.createThread(
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
        li = ThreadListUI.createThread(
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
        li = ThreadListUI.createThread(
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
        li = ThreadListUI.createThread(
          Thread.create(message)
        );

        assert.ok(li.dataset.lastMessageType, 'mms');
      });
    });
  });

  suite('onMessageReceived >', function() {
    var firstMessage, secondMessage;

    setup(function() {
      this.sinon.spy(ThreadListUI, 'updateThread');

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

      sinon.assert.calledWith(ThreadListUI.updateThread, firstMessage, {
        unread: true
      });
    });

    test('Thread is correctly marked as read', function() {
      MessageManager.on.withArgs('message-received').yield({
        message: firstMessage
      });

      sinon.assert.calledWith(ThreadListUI.updateThread, firstMessage, {
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

      sinon.assert.calledWith(ThreadListUI.updateThread, secondMessage, {
        unread: false
      });
    });
  });

  suite('onMessageSending >', function() {
    var firstMessage, secondMessage;

    setup(function() {
      this.sinon.spy(ThreadListUI, 'updateThread');

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

      sinon.assert.calledWith(ThreadListUI.updateThread, firstMessage);
    });
  });

  suite('appendThread', function() {
    setup(function() {
      this.sinon.stub(ThreadListUI, 'setContact');
      this.sinon.stub(ThreadListUI, 'checkInputs');
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
      });

      test('show up in a new container', function() {
        ThreadListUI.appendThread(thread);
        var newContainerId = 'threadsContainer_' + (+thread.timestamp);
        var newContainer = document.getElementById(newContainerId);
        assert.ok(newContainer);
        assert.ok(newContainer.querySelector('li'));
        var expectedThreadId = 'thread-' + thread.id;
        assert.equal(newContainer.querySelector('li').id, expectedThreadId);
      });

      test('should return false when adding to existing thread', function() {
        assert.isTrue(ThreadListUI.appendThread(thread));
        assert.isFalse(ThreadListUI.appendThread(thread));
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
        ThreadListUI.appendThread(thread);

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
      });

      test('show up in same container', function() {
        ThreadListUI.appendThread(thread);
        var existingContainerId = 'threadsContainer_' + (+someDate);
        var existingContainer = document.getElementById(existingContainerId);
        assert.ok(existingContainer);
        assert.ok(existingContainer.querySelector('li'));
        var expectedThreadId = 'thread-' + thread.id;
        assert.equal(existingContainer.querySelector('li').id,
                     expectedThreadId);
      });

      test('should be inserted in the right spot', function() {
        ThreadListUI.appendThread(thread);
        appendSingleNewMessage();
      });

      test('in edit mode and a new message arrives', function() {
        ThreadListUI.appendThread(thread);
        ThreadListUI.startEdit();
        appendSingleNewMessage();
        ThreadListUI.cancelEdit();
      });

      test('should return false when adding to existing thread', function() {
        assert.isFalse(ThreadListUI.appendThread(thread));
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

        ThreadListUI.appendThread(thread);

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
    var firstViewDone;
    setup(function() {
      this.sinon.spy(ThreadListUI, 'setEmpty');
      this.sinon.spy(ThreadListUI, 'prepareRendering');
      this.sinon.spy(ThreadListUI, 'startRendering');
      this.sinon.spy(ThreadListUI, 'finalizeRendering');
      this.sinon.spy(ThreadListUI, 'renderThreads');
      this.sinon.spy(ThreadListUI, 'appendThread');
      this.sinon.spy(ThreadListUI, 'createThread');
      this.sinon.spy(ThreadListUI, 'setContact');
      this.sinon.spy(ThreadListUI, 'renderDrafts');
      this.sinon.spy(MockStickyHeader.prototype, 'refresh');
      this.sinon.spy(window, 'StickyHeader');
      firstViewDone = sinon.stub();

      Threads.clear();
    });

    test('Rendering an empty screen', function(done) {
      this.sinon.stub(MessageManager, 'getThreads', function(options) {
        options.end();
        options.done();
      });

      ThreadListUI.renderThreads(firstViewDone, function() {
        done(function checks() {
          sinon.assert.called(firstViewDone);
          sinon.assert.called(ThreadListUI.renderDrafts);
          sinon.assert.called(StickyHeader);
          sinon.assert.calledWith(ThreadListUI.finalizeRendering, true);
          assert.isFalse(ThreadListUI.noMessages.classList.contains('hide'));
          assert.isTrue(ThreadListUI.container.classList.contains('hide'));
        });
      });
    });

    test('Rendering a few threads', function(done) {
      var container = ThreadListUI.container;

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

      ThreadListUI.renderThreads(firstViewDone, function() {
        done(function checks() {
          sinon.assert.calledWith(ThreadListUI.finalizeRendering, false);
          assert.isTrue(ThreadListUI.noMessages.classList.contains('hide'));
          assert.isFalse(ThreadListUI.container.classList.contains('hide'));
          sinon.assert.called(StickyHeader);
          sinon.assert.called(ThreadListUI.sticky.refresh);

          var mmsThreads = container.querySelectorAll(
            '[data-last-message-type="mms"]'
          );
          var smsThreads = container.querySelectorAll(
            '[data-last-message-type="sms"]'
          );

          // Check that all threads have been properly inserted in the list
          assert.equal(mmsThreads.length, 2);
          assert.equal(smsThreads.length, 8);
        });
      });
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
        ThreadListUI.renderThreads(() => {
          done(function checks() {
            threadList.forEach(
              (thread) => assert.isTrue(Threads.has(thread.id))
            );
          });
        });
      });

      test('Updates thread UI header if thread to render is currently active',
      function(done) {
        this.sinon.spy(ThreadUI, 'updateHeaderData');
        this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
        Navigation.isCurrentPanel.withArgs('thread', { id: threadList[0].id }).
          returns(true);

        ThreadListUI.renderThreads(() => {
          done(function checks() {
            sinon.assert.calledOnce(ThreadUI.updateHeaderData);
          });
        });
      });
    });
  });

  suite('renderDrafts', function() {
    var draft;
    var thread, threadDraft;

    setup(function() {
      this.sinon.spy(ThreadListUI, 'renderThreads');
      this.sinon.spy(ThreadListUI, 'appendThread');
      this.sinon.spy(ThreadListUI, 'createThread');
      this.sinon.spy(ThreadListUI, 'updateThread');
      this.sinon.spy(ThreadListUI, 'setContact');

      var someDate = new Date(2013, 1, 1).getTime();
      insertMockMarkup(someDate);

      var nextDate = new Date(2013, 1, 2);
      var message = MockMessages.sms({
        threadId: 3,
        timestamp: +nextDate
      });

      Threads.registerMessage(message);
      thread = Threads.get(3);
      ThreadListUI.appendThread(thread);

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

      this.sinon.stub(Drafts, 'request', function(callback) {
        callback([draft, threadDraft]);
      });

      ThreadListUI.draftLinks = new Map();
      ThreadListUI.draftRegistry = {};

      ThreadListUI.renderDrafts();
    });

    teardown(function() {
      Drafts.clear();
    });

    test('Draft.request is called', function() {
      sinon.assert.called(Drafts.request);
    });

    test('ThreadListUI.appendThread is called', function() {
      sinon.assert.called(ThreadListUI.appendThread);
    });

    test('ThreadListUI.createThread is called', function() {
      sinon.assert.called(ThreadListUI.createThread);
    });

    test('ThreadListUI.updateThread is called', function() {
      sinon.assert.called(ThreadListUI.updateThread);
    });

    test('ThreadListUI.setContact is called', function() {
      sinon.assert.called(ThreadListUI.setContact);
    });

    test('click on a draft populates ThreadUI.draft', function() {
      document.querySelector('#thread-101 a').click();
      assert.equal(ThreadUI.draft, draft);
    });
  });

  suite('draftSaved', function() {

    setup(function() {
      this.sinon.useFakeTimers();
    });

    test('draft saved banner shown and hidden', function() {
      assert.isTrue(draftSavedBanner.classList.contains('hide'));
      ThreadListUI.onDraftSaved();
      assert.isFalse(draftSavedBanner.classList.contains('hide'));
      this.sinon.clock.tick(ThreadListUI.DRAFT_SAVED_DURATION - 1);
      assert.isFalse(draftSavedBanner.classList.contains('hide'));
      this.sinon.clock.tick(1);
      assert.isTrue(draftSavedBanner.classList.contains('hide'));
    });
  });

  suite('setContact', function() {
    var node, pictureContainer;

    setup(function() {
      this.sinon.stub(Contacts, 'findByAddress');
      this.sinon.stub(window.URL, 'revokeObjectURL');

      var thread = {
        id: 1,
        participants: ['555'],
        lastMessageType: 'sms',
        body: 'Hello 555',
        timestamp: Date.now(),
        unreadCount: 0
      };

      Threads.set(1, thread);
      node = ThreadListUI.createThread(thread);
      pictureContainer = node.querySelector('.pack-end');

      ThreadListUI.setContact(node);
    });

    teardown(function() {
      ThreadListUI.container.textContent = '';
    });

    test('display the picture of a contact', function() {
      pictureContainer.classList.add('empty');

      var contactInfo = MockContact.list();
      contactInfo[0].photo = [new Blob(['test'], { type: 'image/jpeg' })];
      Contacts.findByAddress.yield(contactInfo);

      var photo = node.querySelector('span[data-type=img]');
      assert.include(photo.style.backgroundImage, 'blob:');
      assert.isFalse(pictureContainer.classList.contains('empty'));
      assert.include(node.dataset.photoUrl, 'blob:');
    });

    test('display correctly a contact without a picture', function() {
      var contactInfo = MockContact.list();
      Contacts.findByAddress.yield(contactInfo);

      var photo = node.querySelector('span[data-type=img]');
      assert.isFalse(photo.style.backgroundImage.contains('blob:'));
      assert.isTrue(pictureContainer.classList.contains('empty'));
    });

    test('correctly revokes old contact image blob URL', function() {
      // Doesn't revoke anything if nothing to revoke
      node.dataset.photoUrl = '';
      Contacts.findByAddress.yield(MockContact.list());

      sinon.assert.notCalled(window.URL.revokeObjectURL);

      // Call revoke if we had image before and now contact also has image
      node.dataset.photoUrl = 'blob://data#1';
      var contactInfo = MockContact.list();
      contactInfo[0].photo = [new Blob(['test'], { type: 'image/jpeg' })];
      Contacts.findByAddress.yield(contactInfo);

      sinon.assert.calledWith(window.URL.revokeObjectURL, 'blob://data#1');

      // Call revoke if we had image before, but don't have it now
      node.dataset.photoUrl = 'blob://data#2';
      Contacts.findByAddress.yield(MockContact.list());

      sinon.assert.calledWith(window.URL.revokeObjectURL, 'blob://data#2');
      assert.equal(node.dataset.photoUrl, '');
    });
  });

  suite('[Email]setContact', function() {
    var node, pictureContainer;

    setup(function() {
      this.sinon.stub(Contacts, 'findByAddress');
      var thread = {
        id: 1,
        participants: ['a@b.com'],
        lastMessageType: 'mms',
        body: 'Hello a@b.com',
        timestamp: Date.now(),
        unreadCount: 0
      };

      Threads.set(1, thread);
      node = ThreadListUI.createThread(thread);
      pictureContainer = node.querySelector('.pack-end');

      ThreadListUI.setContact(node);
    });

    teardown(function() {
      ThreadListUI.container.textContent = '';
    });

    test('[Email]display the picture of a contact', function() {
      MockSettings.supportEmailRecipient = true;
      pictureContainer.classList.add('empty');

      var contactInfo = MockContact.list();
      contactInfo[0].photo = [new Blob(['test'], { type: 'image/jpeg' })];
      Contacts.findByAddress.yield(contactInfo);

      var photo = node.querySelector('span[data-type=img]');
      assert.include(photo.style.backgroundImage, 'blob:');
      assert.isFalse(pictureContainer.classList.contains('empty'));
      assert.include(node.dataset.photoUrl, 'blob:');
    });

    test('[Email]display correctly a contact without a picture', function() {
      MockSettings.supportEmailRecipient = true;
      var contactInfo = MockContact.list();
      Contacts.findByAddress.yield(contactInfo);

      var photo = node.querySelector('span[data-type=img]');
      assert.isFalse(photo.style.backgroundImage.contains('blob:'));
      assert.isTrue(pictureContainer.classList.contains('empty'));
    });
  });

  suite('beforeLeave()', function() {
    setup(function() {

      this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
      Navigation.isCurrentPanel.withArgs('thread-list').returns(true);
      ThreadListUI.startEdit();
    });

    test('Exit edit mode (Thread or Message) ', function() {
      ThreadListUI.beforeLeave();
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

    test('clicking on a list item', function() {
      thread1.querySelector('a').click();

      sinon.assert.calledWith(Navigation.toPanel, 'thread', { id: 1 });
    });

    test('clicking on a list item in edit mode', function() {
      thread1.querySelector('label').click();

      sinon.assert.notCalled(Navigation.toPanel);
      assert.ok(thread1.querySelector('input').checked);
    });
  });
});
