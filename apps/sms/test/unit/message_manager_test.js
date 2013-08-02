'use strict';

requireApp('sms/js/utils.js');
requireApp('sms/test/unit/utils_mockup.js');
requireApp('sms/test/unit/mock_messages.js');

requireApp('sms/test/unit/mock_thread_ui.js');
requireApp('sms/test/unit/mock_thread_list_ui.js');
requireApp('sms/test/unit/mock_threads.js');
requireApp('sms/test/unit/mock_navigatormoz_sms.js');
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
  'Utils'
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
});
