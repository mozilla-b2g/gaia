/*global mocha, MocksHelper, loadBodyHTML, MockL10n, ThreadListUI, FixedHeader,
         MessageManager, WaitingScreen, Threads, Template, MockMessages */

'use strict';

// remove this when https://github.com/visionmedia/mocha/issues/819 is merged in
// mocha and when we have that new mocha in test agent
mocha.setup({ globals: ['alert', 'confirm'] });

requireApp('sms/js/utils.js');
requireApp('sms/js/recipients.js');
requireApp('sms/js/threads.js');
requireApp('sms/js/thread_list_ui.js');

requireApp('sms/test/unit/mock_time_headers.js');
requireApp('sms/test/unit/mock_fixed_header.js');
requireApp('sms/test/unit/mock_l10n.js');
requireApp('sms/test/unit/mock_message_manager.js');
requireApp('sms/test/unit/mock_messages.js');
requireApp('sms/test/unit/mock_utils.js');
requireApp('sms/test/unit/mock_waiting_screen.js');

var mocksHelperForThreadListUI = new MocksHelper([
  'FixedHeader',
  'MessageManager',
  'Utils',
  'WaitingScreen',
  'TimeHeaders'
]).init();

suite('thread_list_ui', function() {
  var nativeMozL10n = navigator.mozL10n;

  mocksHelperForThreadListUI.attachTestHelpers();
  suiteSetup(function() {
    loadBodyHTML('/index.html');
    navigator.mozL10n = MockL10n;
    ThreadListUI.init();
  });

  suiteTeardown(function() {
    navigator.mozL10n = nativeMozL10n;
  });

  function insertMockMarkup(someDate) {
    someDate = +someDate;
    var markup =
      '<header></header>' +
      '<ul id="threadsContainer_' + someDate + '">' +
        '<li id="thread-1" data-time="' + someDate + '"></li>' +
        '<li id="thread-2" data-time="' + someDate + '"></li>' +
      '</ul>';

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


      test('second render aborts first', function(done) {
        ThreadListUI.renderThreads([{},{}], function() {
          // this should not be called
          assert.ok(false);
        });
        ThreadListUI.renderThreads([{}], function() {
          // this should not be called
          assert.ok(false);
        });
        // only the last render should complete
        ThreadListUI.renderThreads([{okay: true},{okay: true}], function() {
          assert.ok(true);
          assert.equal(appendCallCount, 2);
          done();
        });
      });

    });

  });

  suite('setEmpty', function() {
    suite('(true)', function() {
      setup(function() {
        // set wrong states
        ThreadListUI.noMessages.classList.add('hide');
        ThreadListUI.container.classList.remove('hide');
        ThreadListUI.editIcon.classList.remove('disabled');
        // make sure it sets em all
        ThreadListUI.setEmpty(true);
      });
      test('removes noMessages hide', function() {
        assert.isFalse(ThreadListUI.noMessages.classList.contains('hide'));
      });
      test('adds container hide', function() {
        assert.isTrue(ThreadListUI.container.classList.contains('hide'));
      });
      test('adds editIcon disabled', function() {
        assert.isTrue(ThreadListUI.editIcon.classList.contains('disabled'));
      });
    });
    suite('(false)', function() {
      setup(function() {
        // set wrong states
        ThreadListUI.noMessages.classList.remove('hide');
        ThreadListUI.container.classList.add('hide');
        ThreadListUI.editIcon.classList.add('disabled');
        // make sure it sets em all
        ThreadListUI.setEmpty(false);
      });
      test('adds noMessages hide', function() {
        assert.isTrue(ThreadListUI.noMessages.classList.contains('hide'));
      });
      test('removes container hide', function() {
        assert.isFalse(ThreadListUI.container.classList.contains('hide'));
      });
      test('removes editIcon disabled', function() {
        assert.isFalse(ThreadListUI.editIcon.classList.contains('disabled'));
      });
    });
  });

  suite('removeThread', function() {
    setup(function() {
      ThreadListUI.container.innerHTML = '<h2 id="header-1"></h2>' +
        '<ul id="list-1"><li id="thread-1"></li>' +
        '<li id="thread-2"></li></ul>' +
        '<h2 id="header-2"></h2>' +
        '<ul id="list-2"><li id="thread-3"></li></ul>';
      this.sinon.stub(FixedHeader, 'refresh');
    });

    suite('remove last thread in header', function() {
      setup(function() {
        ThreadListUI.removeThread(3);
      });
      test('calls FixedHeader.refresh', function() {
        assert.isTrue(FixedHeader.refresh.called);
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
      test('no FixedHeader.refresh when not removing a header', function() {
        assert.isFalse(FixedHeader.refresh.called);
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
  });

  suite('updateThread', function() {
    setup(function() {
      this.sinon.spy(Threads, 'createThreadMockup');
      this.sinon.spy(ThreadListUI, 'removeThread');
      this.sinon.spy(ThreadListUI, 'appendThread');
      this.sinon.spy(FixedHeader, 'refresh');
      this.sinon.spy(ThreadListUI, 'mark');
      this.sinon.spy(ThreadListUI, 'setEmpty');
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
        // first call, first argument, first item

        sinon.assert.calledWithMatch(ThreadListUI.appendThread, {
          id: message.threadId,
          body: message.body
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
          timestamp: nextDate
        });

        ThreadListUI.updateThread(message);
      });
      test(' > createThreadMockup is called', function() {
        sinon.assert.calledOnce(Threads.createThreadMockup);
      });

      test(' > removeThread is called', function() {
        sinon.assert.calledOnce(ThreadListUI.removeThread);
        sinon.assert.calledOnce(ThreadListUI.appendThread);
      });

      test(' > new message, new thread.', function() {
        var newDate = new Date(2013, 1, 2);
        var newMessage = MockMessages.sms({
          threadId: 20,
          timestamp: newDate
        });
        ThreadListUI.updateThread(newMessage, {read: false});
        // As this is a new message we dont have to remove threads
        // So we have only one removeThread for the first appending
        sinon.assert.calledOnce(ThreadListUI.removeThread);
        // But we have appended twice
        sinon.assert.calledTwice(ThreadListUI.appendThread);
      });

      test('refresh the fixed header', function() {
        sinon.assert.called(FixedHeader.refresh);
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
          timestamp: nextDate
        });
        thread = Threads.createThreadMockup(message);
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
          timestamp: nextDate
        });
        thread = Threads.createThreadMockup(message);
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

      test('refresh the fixed header', function() {
        sinon.assert.called(FixedHeader.refresh);
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
          timestamp: prevDate
        });
        ThreadListUI.updateThread(message, {read: false});
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
      });
    });
  });

  suite('delete', function() {
    setup(function() {
      this.selectedInputs = [{value: 1}, {value: 2}];
      this.sinon.stub(ThreadListUI, 'getSelectedInputs', function() {
        return this.selectedInputs;
      }.bind(this));
      this.sinon.stub(MessageManager, 'getMessages');
    });
    suite('confirm false', function() {
      setup(function() {
        this.sinon.stub(window, 'confirm').returns(false);
        ThreadListUI.delete();
      });
      test('called confirm with proper message', function() {
        assert.deepEqual(window.confirm.args[0],
          ['deleteThreads-confirmation2']);
      });
    });
    suite('confirm true', function() {
      setup(function() {
        this.sinon.stub(WaitingScreen, 'show');
        this.sinon.stub(WaitingScreen, 'hide');
        this.sinon.stub(window, 'confirm').returns(true);
        ThreadListUI.delete();
      });
      test('shows WaitingScreen', function() {
        assert.ok(WaitingScreen.show.called);
      });
      test('called confirm with proper message', function() {
        assert.deepEqual(window.confirm.args[0],
          ['deleteThreads-confirmation2']);
      });
      test('called MessageManager.getMessages twice', function() {
        assert.equal(MessageManager.getMessages.args.length, 2);
      });
      suite('getMessages({ each: })', function() {
        setup(function() {
          this.sinon.stub(MessageManager, 'deleteMessage');
          // call the "each" function passed to getMessages with fake message
          MessageManager.getMessages.args[0][0].each({ id: 3 });
        });
        test('MessageManager.deleteMessage called', function() {
          assert.ok(MessageManager.deleteMessage.calledWith(3));
        });
      });
      suite('first getMessages', function() {
        setup(function() {
          this.sinon.stub(Threads, 'delete');
          this.sinon.stub(ThreadListUI, 'removeThread');
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
          test('end calls hide waiting screen', function() {
            assert.isTrue(WaitingScreen.hide.called);
          });
        });
      });
    });
  });

  suite('createThread', function() {
    setup(function() {
      this.sinon.spy(Template, 'escape');
    });

    function buildSMSThread(payload) {
      var o = {
        id: 1,
        lastMessageType: 'sms',
        participants: ['1234'],
        body: payload,
        timestamp: new Date()
      };
      return o;
    }

    function buildMMSThread(payload) {
      var o = {
        id: 1,
        lastMessageType: 'mms',
        participants: ['1234', '5678'],
        body: payload,
        timestamp: new Date()
      };
      return o;
    }

    test('escapes the body for SMS', function() {
      var payload = 'hello <a href="world">world</a>';
      ThreadListUI.createThread(buildSMSThread(payload));
      assert.ok(Template.escape.calledWith(payload));
    });

    test('escapes the body for MMS', function() {
      var payload = 'hello <a href="world">world</a>';
      ThreadListUI.createThread(buildMMSThread(payload));
      assert.ok(Template.escape.calledWith(payload));
    });
  });

  suite('onMessageReceived', function() {
    var updateThreadSpy;
    setup(function() {
      updateThreadSpy = this.sinon.spy(ThreadListUI, 'updateThread');
      var message = MockMessages.sms();
      ThreadListUI.onMessageReceived(message);
    });

    teardown(function() {
      updateThreadSpy = null;
    });

    test(' updateThread is called when a new message is received', function() {
      assert.ok(updateThreadSpy.called);
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
          timestamp: nextDate
        });

        thread = Threads.createThreadMockup(message);
        ThreadListUI.appendThread(thread);
      });

      test('show up in a new container', function() {
        var newContainerId = 'threadsContainer_' + thread.timestamp.getTime();
        var newContainer = document.getElementById(newContainerId);
        assert.ok(newContainer);
        assert.ok(newContainer.querySelector('li'));
        var expectedThreadId = 'thread-' + thread.id;
        assert.equal(newContainer.querySelector('li').id, expectedThreadId);
      });
    });

    suite('existing thread and new message in a day', function() {
      var thread;

      setup(function() {
        var someDate = new Date(2013, 1, 1).getTime();
        insertMockMarkup(someDate);

        var nextDate = new Date(2013, 1, 2);
        var message = MockMessages.sms({
          threadId: 2,
          timestamp: nextDate
        });

        thread = Threads.createThreadMockup(message);
        ThreadListUI.appendThread(thread);
      });

      test('show up in a new container', function() {
        var newContainerId = 'threadsContainer_' + thread.timestamp.getTime();
        var newContainer = document.getElementById(newContainerId);
        assert.ok(newContainer);
        assert.ok(newContainer.querySelector('li'));
        var expectedThreadId = 'thread-' + thread.id;
        assert.equal(newContainer.querySelector('li').id, expectedThreadId);
      });
    });
  });

  suite('renderThreads', function() {
    setup(function() {
      this.sinon.spy(FixedHeader, 'refresh');
      this.sinon.spy(ThreadListUI, 'setEmpty');
    });

    test('Rendering an empty screen', function() {
      ThreadListUI.renderThreads([]);
      assert.ok(FixedHeader.refresh.called);
      assert.ok(ThreadListUI.setEmpty.called);
      assert.isTrue(ThreadListUI.setEmpty.args[0][0]);
    });
  });
});
