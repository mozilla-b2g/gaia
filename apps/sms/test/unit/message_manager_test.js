'use strict';

requireApp('sms/js/utils.js');
requireApp('sms/test/unit/utils_mockup.js');
requireApp('sms/test/unit/mock_messages.js');

requireApp('sms/test/unit/mock_thread_ui.js');
requireApp('sms/test/unit/mock_thread_list_ui.js');
requireApp('sms/test/unit/mock_threads.js');
requireApp('sms/test/unit/mock_navigatormoz_sms.js');
requireApp('sms/test/unit/mock_moz_sms_filter.js');
requireApp('sms/test/unit/mock_smil.js');
requireApp('sms/test/unit/mock_recipients.js');
requireApp('sms/test/unit/mock_compose.js');
requireApp('sms/test/unit/mock_contact.js');
requireApp('sms/test/unit/mock_contacts.js');
requireApp('sms/test/unit/mock_utils.js');
requireApp('sms/test/unit/mock_l10n.js');

requireApp('sms/js/message_manager.js');

var mocksHelperForMessageManager = new MocksHelper([
  'ThreadUI',
  'ThreadListUI',
  'Threads',
  'SMIL',
  'Recipients',
  'Compose',
  'Contacts',
  'Utils',
  'MozSmsFilter'
]);

mocksHelperForMessageManager.init();

suite('message_manager.js >', function() {

  var mocksHelper = mocksHelperForMessageManager;
  var realMozMobileMessage;

  suiteSetup(function() {
    mocksHelper.suiteSetup();
    realMozMobileMessage = MessageManager._mozMobileMessage;
    MessageManager._mozMobileMessage = MockNavigatormozMobileMessage;
  });

  suiteTeardown(function() {
    mocksHelper.suiteTeardown();
    MessageManager._mozMobileMessage = realMozMobileMessage;
  });

  suite('on message sent > ', function() {

    setup(function() {
      this.sinon.spy(ThreadUI, 'appendMessage');
    });

    test('message is shown in the current thread if it belongs to the thread',
      function() {
        var sms = MockMessages.sms;
        // ensure the threadId is different
        Threads.currentId = sms.threadId + 1;
        MessageManager.onMessageSending({ message: sms });
        assert.isFalse(ThreadUI.appendMessage.called);
      }
    );
  });

  suite('sendSMS() >', function() {
    test('send to one recipient successfully', function() {
      var onSuccessCalledTimes = 0;
      var onCompleteCalledTimes = 0;

      MessageManager.sendSMS(
        '123',
        'hola',
        function() {
          onSuccessCalledTimes += 1;
        },
        null,
        function() {
          onCompleteCalledTimes += 1;
        }
      );

      MockNavigatormozMobileMessage.mTriggerSmsOnSuccess();
      assert.equal(onSuccessCalledTimes, 1);
      assert.equal(onCompleteCalledTimes, 1);
    });

    test('send to two recipients successfully', function() {
      var onSuccessCalledTimes = 0;
      var onCompleteCalledTimes = 0;
      var recipients = ['123', '456'];

      MessageManager.sendSMS(
        recipients,
        'hola',
        function() {
          onSuccessCalledTimes += 1;
        },
        null,
        function() {
          onCompleteCalledTimes += 1;
        }
      );

      MockNavigatormozMobileMessage.mTriggerSmsOnSuccess();
      assert.equal(onSuccessCalledTimes, recipients.length);
      assert.equal(onCompleteCalledTimes, 1);
    });

    test('send to one recipient unsuccessfully', function() {
      var onErrorCalledTimes = 0;
      var onCompleteCalledTimes = 0;

      MessageManager.sendSMS(
        '123',
        'hola',
        null,
        function() {
          onErrorCalledTimes += 1;
        },
        function() {
          onCompleteCalledTimes += 1;
        }
      );

      MockNavigatormozMobileMessage.mTriggerSmsOnError();
      assert.equal(onErrorCalledTimes, 1);
      assert.equal(onCompleteCalledTimes, 1);
    });

    test('send to two recipients unsuccessfully', function() {
      var onErrorCalledTimes = 0;
      var onCompleteCalledTimes = 0;
      var recipients = ['123', '456'];

      MessageManager.sendSMS(
        recipients,
        'hola',
        null,
        function() {
          onErrorCalledTimes += 1;
        },
        function() {
          onCompleteCalledTimes += 1;
        }
      );

      MockNavigatormozMobileMessage.mTriggerSmsOnError();
      assert.equal(onErrorCalledTimes, recipients.length);
      assert.equal(onCompleteCalledTimes, 1);
    });
  });

  suite('sendMMS() >', function() {
    test('send to one recipient successfully', function() {
      var isOnSuccessCalled = false;

      MessageManager.sendMMS('123', 'hola', function() {
        isOnSuccessCalled = true;
      }, null);

      MockNavigatormozMobileMessage.mTriggerMmsOnSuccess();
      assert.ok(isOnSuccessCalled);
    });

    test('send to two recipients successfully', function() {
      var onSuccessCalledTimes = 0;
      var recipients = ['123', '456'];

      MessageManager.sendMMS(recipients, 'hola', function() {
        onSuccessCalledTimes += 1;
      }, null);

      MockNavigatormozMobileMessage.mTriggerMmsOnSuccess();
      assert.equal(onSuccessCalledTimes, 1);
    });

    test('send to one recipient unsuccessfully', function() {
      var onErrorCalledTimes = 0;

      MessageManager.sendMMS('123', 'hola', null, function() {
        onErrorCalledTimes += 1;
      });

      MockNavigatormozMobileMessage.mTriggerMmsOnError();
      assert.equal(onErrorCalledTimes, 1);
    });

    test('send to two recipients unsuccessfully', function() {
      var onErrorCalledTimes = 0;
      var recipients = ['123', '456'];

      MessageManager.sendMMS(recipients, 'hola', null, function() {
        onErrorCalledTimes += 1;
      });

      MockNavigatormozMobileMessage.mTriggerMmsOnError();
      assert.equal(onErrorCalledTimes, 1);
    });
  });

  suite('launchComposer() >', function() {
    var nativeMozL10n = navigator.mozL10n;
    suiteSetup(function() {
      navigator.mozL10n = MockL10n;
      loadBodyHTML('/index.html');
      ThreadUI.initRecipients();
    });

    setup(function() {

      ThreadUI.recipients.length = 0;

      this.sinon.stub(
        MessageManager, 'slide', function(direction, callback) {
          callback();
        }
      );

      this.sinon.stub(
        Contacts, 'findByPhoneNumber', function(tel, callback) {
          callback(MockContact.list());
        }
      );

      this.sinon.stub(ThreadUI, 'setMessageBody');

      MessageManager.threadMessages = document.createElement('div');
    });

    suiteTeardown(function() {
      navigator.mozL10n = nativeMozL10n;
      ThreadUI.recipients = null;
    });

    test('from activity with unknown contact', function() {
      MessageManager.launchComposer({
        number: '998',
        contact: null
      });

      assert.equal(ThreadUI.recipients.numbers.length, 1);
      assert.equal(ThreadUI.recipients.numbers[0], '998');
      assert.ok(ThreadUI.setMessageBody.calledWith());
    });

    test('from activity with known contact', function() {
      MessageManager.launchComposer({
        contact: new MockContact()
      });

      assert.equal(ThreadUI.recipients.numbers.length, 1);
      assert.equal(ThreadUI.recipients.numbers[0], '+346578888888');
      assert.ok(ThreadUI.setMessageBody.calledWith());
    });

    test('with message body', function() {
      MessageManager.launchComposer({
        number: '998',
        contact: null,
        body: 'test'
      });
      assert.ok(ThreadUI.setMessageBody.calledWith('test'));
    });

    test('No contact and no number', function() {
      MessageManager.launchComposer({
        number: null,
        contact: null,
        body: 'Youtube url'
      });
      assert.equal(ThreadUI.recipients.numbers.length, 0);
      assert.ok(ThreadUI.setMessageBody.calledWith('Youtube url'));
    });
  });

  suite('getMessages() >', function() {
    var options;

    setup(function() {
      this.sinon.spy(MockNavigatormozMobileMessage, 'getMessages');

      var filter = new MozSmsFilter();
      filter.threadId = 1;

      options = {
        filter: filter,
        each: sinon.spy(function(message) {
          return !message.stopHere;
        }),
        end: sinon.stub(),
        done: sinon.stub()
      };

      MessageManager.getMessages(options);
    });

    test('rendering goes to the end', function() {
      var messagesList = [
        { id: 1 },
        { id: 2 },
        { id: 3 },
        { id: 4 }
      ];

      MockNavigatormozMobileMessage.mTriggerMessagesRequest(messagesList);

      assert.equal(options.each.callCount, 4);
      assert.ok(options.done.called);
      assert.ok(options.end.called);
      assert.ok(options.done.calledAfter(options.end));
    });

    test('rendering is interrupted', function() {
      var messagesList = [
        { id: 1 },
        { id: 2 },
        { id: 3, stopHere: true },
        { id: 4 }
      ];

      MockNavigatormozMobileMessage.mTriggerMessagesRequest(messagesList);

      assert.equal(options.each.callCount, 3);
      assert.ok(options.done.called);
      assert.isFalse(options.end.called);
    });
  });

  suite('markThreadRead()', function() {

    setup(function() {
      this.sinon.spy(MockNavigatormozMobileMessage, 'getMessages');
      this.sinon.spy(MockNavigatormozMobileMessage, 'markMessageRead');

      MessageManager.markThreadRead(1);
    });

    test('call mark read on the correct messages', function() {
      assert.ok(
        MockNavigatormozMobileMessage.getMessages.calledWithMatch({
          threadId: 1,
          read: false
        })
      );

      var messagesList = [
        { id: 1 },
        { id: 2 },
        { id: 3 },
        { id: 4 }
      ];

      MockNavigatormozMobileMessage.mTriggerMessagesRequest(messagesList);

      MockNavigatormozMobileMessage.mTriggerMarkReadSuccess();
      MockNavigatormozMobileMessage.mTriggerMarkReadSuccess();
      MockNavigatormozMobileMessage.mTriggerMarkReadSuccess();
      MockNavigatormozMobileMessage.mTriggerMarkReadSuccess();

      // doing one more to see if we're not called too many times
      MockNavigatormozMobileMessage.mTriggerMarkReadSuccess();
      assert.equal(MockNavigatormozMobileMessage.markMessageRead.callCount, 4);

      messagesList.forEach(function(message) {
        assert.ok(
          MockNavigatormozMobileMessage.markMessageRead.calledWith(
            message.id, true
          )
        );
      });
    });

  });

  suite('onHashChange', function() {
    setup(function() {
      this.sinon.spy(document.activeElement, 'blur');
      this.sinon.spy(ThreadUI, 'cancelEdit');
      this.sinon.spy(ThreadUI, 'renderMessages');
      this.sinon.stub(ThreadUI, 'updateHeaderData');
      this.sinon.spy(ThreadListUI, 'cancelEdit');
      this.sinon.spy(ThreadListUI, 'mark');
      this.sinon.spy(ThreadUI.groupView, 'reset');
      this.sinon.spy(MessageManager, 'launchComposer');
      this.sinon.stub(MessageManager, 'slide');

      MessageManager.onHashChange();
    });

    test('Remove any focus left on specific elements ', function() {
      assert.ok(document.activeElement.blur.called);
    });

    test('Exit edit mode (Thread or Message) ', function() {
      assert.ok(ThreadUI.cancelEdit.called);
      assert.ok(ThreadListUI.cancelEdit.called);
    });

    test('Reset Group Participants View ', function() {
      assert.ok(ThreadUI.groupView.reset.called);
    });

    suite('> Switch to #new', function() {
      setup(function() {
        this.activity = MessageManager.activity = { test: true };
        window.location.hash = '#new';
        MessageManager.onHashChange();
      });
      teardown(function() {
        MessageManager.activity = null;
      });
      test('called launchComposer with activity', function() {
        assert.ok(MessageManager.launchComposer.calledWith(this.activity));
      });

      suite('> Switch to #thread=100', function() {
        setup(function() {
          // reset states
          MessageManager.threadMessages.classList.add('new');
          MessageManager.slide.reset();
          ThreadUI.updateHeaderData.reset();
          ThreadUI.inThread = false;

          this.threadId = MockThreads.currentId = 100;
          window.location.hash = '#thread=' + this.threadId;
          MessageManager.onHashChange();
        });
        teardown(function() {
          MockThreads.currentId = null;
        });
        test('removes "new" class from messages', function() {
          assert.isFalse(
            MessageManager.threadMessages.classList.contains('new')
          );
        });
        test('calls ThreadListUI.mark', function() {
          assert.ok(
            ThreadListUI.mark.calledWith(this.threadId, 'read')
          );
        });
        test('calls updateHeaderData', function() {
          assert.ok(
            ThreadUI.updateHeaderData.called
          );
        });

        suite('> header data updated', function() {
          setup(function() {
            ThreadUI.updateHeaderData.yield();
          });
          test('does not call MessageManager.slide', function() {
            assert.isFalse(
              MessageManager.slide.called
            );
          });
          test('sets ThreadUI.inThread', function() {
            assert.isTrue(
              ThreadUI.inThread
            );
          });
          test('calls ThreadUI.renderMessages', function() {
            assert.ok(ThreadUI.renderMessages.called);
            assert.equal(
              ThreadUI.renderMessages.args[0][0], this.threadId
            );
          });
        });
      });
    });

    suite('> Switch to #thread=100', function() {
      setup(function() {
        // reset states
        MessageManager.threadMessages.classList.remove('new');
        MessageManager.slide.reset();
        ThreadUI.updateHeaderData.reset();
        ThreadUI.inThread = false;

        this.threadId = MockThreads.currentId = 100;
        window.location.hash = '#thread=' + this.threadId;
        MessageManager.onHashChange();
      });
      teardown(function() {
        MockThreads.currentId = null;
      });
      test('calls ThreadListUI.mark', function() {
        assert.ok(
          ThreadListUI.mark.calledWith(this.threadId, 'read')
        );
      });
      test('calls updateHeaderData', function() {
        assert.ok(
          ThreadUI.updateHeaderData.called
        );
      });

      suite('> header data updated', function() {
        setup(function() {
          ThreadUI.updateHeaderData.yield();
        });
        test('calls MessageManager.slide', function() {
          assert.ok(
            MessageManager.slide.called
          );
        });

        suite('> slide completed', function() {
          setup(function() {
            MessageManager.slide.yield();
          });
          test('sets ThreadUI.inThread', function() {
            assert.isTrue(
              ThreadUI.inThread
            );
          });
          test('calls ThreadUI.renderMessages', function() {
            assert.ok(ThreadUI.renderMessages.called);
            assert.equal(
              ThreadUI.renderMessages.args[0][0], this.threadId
            );
          });
        });
      });
    });
  });
});
