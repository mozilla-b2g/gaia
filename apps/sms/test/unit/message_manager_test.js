/*global
        MessageManager,
        MockNavigatormozMobileMessage,
        MocksHelper,
        MockMessages,
        MozSmsFilter,
        ReportView,
        Settings,
        SMIL,
        ThreadUI,
        Threads
*/

'use strict';

require('/test/unit/mock_messages.js');
require('/test/unit/mock_navigatormoz_sms.js');
require('/test/unit/mock_navigation.js');
require('/test/unit/mock_settings.js');
require('/test/unit/mock_smil.js');
require('/test/unit/mock_thread_ui.js');
require('/test/unit/mock_thread_list_ui.js');
require('/test/unit/mock_threads.js');
require('/test/unit/mock_information.js');

require('/js/message_manager.js');

var mocksHelperForMessageManager = new MocksHelper([
  'Navigation',
  'ReportView',
  'Settings',
  'SMIL',
  'Threads',
  'ThreadListUI',
  'ThreadUI',
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

  setup(function() {
    this.sinon.spy(MockNavigatormozMobileMessage, 'send');
    this.sinon.spy(MockNavigatormozMobileMessage, 'sendMMS');
  });


  suite('on message sent > ', function() {
    setup(function() {
      this.sinon.spy(ThreadUI, 'onMessageSending');
      this.sinon.stub(Threads, 'registerMessage');
    });

    test('ThreadUI is always notified', function() {
        var sms = MockMessages.sms();

        Threads.currentId = sms.threadId;
        MessageManager.onMessageSending({ message: sms });
        sinon.assert.called(ThreadUI.onMessageSending);

        ThreadUI.onMessageSending.reset();

        // ensure the threadId is different
        Threads.currentId = sms.threadId + 1;
        MessageManager.onMessageSending({ message: sms });
        sinon.assert.called(ThreadUI.onMessageSending);
      }
    );
  });

  suite('sendSMS() >', function() {
    test('send to one recipient successfully', function() {
      var smsOpts = {
        recipients: '123',
        content: 'hola',
        onsuccess: sinon.stub(),
        oncomplete: sinon.stub()
      };

      MessageManager.sendSMS(smsOpts);

      sinon.assert.calledWithExactly(
        MockNavigatormozMobileMessage.send,
        ['123'], 'hola', undefined
      );

      MockNavigatormozMobileMessage.mTriggerSmsOnSuccess();
      sinon.assert.calledOnce(smsOpts.onsuccess);
      sinon.assert.calledOnce(smsOpts.oncomplete);
    });

    test('send to two recipients successfully', function() {
      var smsOpts = {
        recipients: ['123', '456'],
        content: 'hola',
        onsuccess: sinon.stub(),
        oncomplete: sinon.stub()
      };

      MessageManager.sendSMS(smsOpts);

      sinon.assert.calledWithExactly(
        MockNavigatormozMobileMessage.send,
        ['123', '456'], 'hola', undefined
      );

      MockNavigatormozMobileMessage.mTriggerSmsOnSuccess();
      sinon.assert.calledTwice(smsOpts.onsuccess);
      sinon.assert.calledOnce(smsOpts.oncomplete);
    });

    test('send to one recipient unsuccessfully', function() {
      var smsOpts = {
        recipients: '123',
        content: 'hola',
        onerror: sinon.stub(),
        oncomplete: sinon.stub()
      };

      MessageManager.sendSMS(smsOpts);

      MockNavigatormozMobileMessage.mTriggerSmsOnError();
      sinon.assert.calledOnce(smsOpts.onerror);
      sinon.assert.calledOnce(smsOpts.oncomplete);
    });

    test('send to two recipients unsuccessfully', function() {
      var smsOpts = {
        recipients: ['123', '456'],
        content: 'hola',
        onerror: sinon.stub(),
        oncomplete: sinon.stub()
      };

      MessageManager.sendSMS(smsOpts);

      MockNavigatormozMobileMessage.mTriggerSmsOnError();
      sinon.assert.calledTwice(smsOpts.onerror);
      sinon.assert.calledOnce(smsOpts.oncomplete);
    });

    test('send with a serviceId in a dual SIM setup', function() {
      this.sinon.stub(Settings, 'hasSeveralSim').returns(true);
      var smsOpts = {
        recipients: '123',
        content: 'hola',
        serviceId: 0 // we use 0 because it's falsy, to test it still works
      };

      MessageManager.sendSMS(smsOpts);

      sinon.assert.calledWithExactly(
        MockNavigatormozMobileMessage.send,
        ['123'], 'hola', { serviceId: 0 }
      );
    });

    test('send with a serviceId in a non-dual SIM setup', function() {
      this.sinon.stub(Settings, 'hasSeveralSim').returns(false);
      var smsOpts = {
        recipients: '123',
        content: 'hola',
        serviceId: 1
      };

      MessageManager.sendSMS(smsOpts);

      sinon.assert.calledWithExactly(
        MockNavigatormozMobileMessage.send,
        ['123'], 'hola', undefined
      );
    });

    test('serviceId is a string containing a number', function() {
      this.sinon.stub(Settings, 'hasSeveralSim').returns(true);
      var smsOpts = {
        recipients: '123',
        content: 'hola',
        serviceId: '0'
      };

      MessageManager.sendSMS(smsOpts);

      sinon.assert.calledWithExactly(
        MockNavigatormozMobileMessage.send,
        ['123'], 'hola', { serviceId: 0 }
      );
    });

    test('serviceId is a bad string', function() {
      this.sinon.stub(Settings, 'hasSeveralSim').returns(true);
      var smsOpts = {
        recipients: '123',
        content: 'hola',
        serviceId: 'oirutoirutoitr'
      };

      MessageManager.sendSMS(smsOpts);

      sinon.assert.calledWithExactly(
        MockNavigatormozMobileMessage.send,
        ['123'], 'hola', undefined
      );
    });
  });

  suite('sendMMS() >', function() {
    setup(function() {
      this.sinon.spy(SMIL, 'generate');
    });

    test('send to one recipient successfully', function() {
      var mmsOpts = {
        recipients: '123',
        subject: null,
        content: 'hola',
        onsuccess: sinon.stub()
      };

      MessageManager.sendMMS(mmsOpts);
      var smil = SMIL.generate.firstCall.returnValue;

      sinon.assert.calledWithExactly(
        MockNavigatormozMobileMessage.sendMMS,
        {
          receivers: ['123'],
          subject: null,
          smil: smil.smil,
          attachments: smil.attachments
        }, /* send options */ undefined
      );

      MockNavigatormozMobileMessage.mTriggerMmsOnSuccess();
      sinon.assert.calledOnce(mmsOpts.onsuccess);
    });

    test('send to two recipients successfully', function() {
      var mmsOpts = {
        recipients: ['123', '456'],
        subject: null,
        content: 'hola',
        onsuccess: sinon.stub()
      };
      MessageManager.sendMMS(mmsOpts);

      MockNavigatormozMobileMessage.mTriggerMmsOnSuccess();
      sinon.assert.calledOnce(mmsOpts.onsuccess);
    });

    test('send to one recipient unsuccessfully', function() {
      var mmsOpts = {
        recipients: '123',
        subject: null,
        content: 'hola',
        onerror: sinon.stub()
      };

      MessageManager.sendMMS(mmsOpts);

      MockNavigatormozMobileMessage.mTriggerMmsOnError();

      sinon.assert.calledOnce(mmsOpts.onerror);
    });

    test('send to two recipients unsuccessfully', function() {
      var mmsOpts = {
        recipients: ['123', '456'],
        subject: null,
        content: 'hola',
        onerror: sinon.stub()
      };

      MessageManager.sendMMS(mmsOpts);

      MockNavigatormozMobileMessage.mTriggerMmsOnError();

      sinon.assert.calledOnce(mmsOpts.onerror);
    });

    suite('send with a serviceId', function() {
      var mmsOpts;

      setup(function() {
        this.sinon.stub(Settings, 'hasSeveralSim').returns(true);

        mmsOpts = {
          recipients: '123',
          subject: null,
          content: 'hola',
          // we use 0 to check that the code behaves correctly with falsy values
          serviceId: 0
        };
      });

      test('while the current serviceId is the same', function() {
        Settings.mmsServiceId = 0;

        MessageManager.sendMMS(mmsOpts);

        var smil = SMIL.generate.firstCall.returnValue;

        sinon.assert.calledWithExactly(
          MockNavigatormozMobileMessage.sendMMS,
          {
            receivers: ['123'],
            subject: null,
            smil: smil.smil,
            attachments: smil.attachments
          }, {
            serviceId: mmsOpts.serviceId
          }
        );
      });

      test('while the current serviceId is different', function() {
        Settings.mmsServiceId = 1;

        MessageManager.sendMMS(mmsOpts);

        var smil = SMIL.generate.firstCall.returnValue;

        sinon.assert.calledWithExactly(
          MockNavigatormozMobileMessage.sendMMS,
          {
            receivers: ['123'],
            subject: null,
            smil: smil.smil,
            attachments: smil.attachments
          }, {
            serviceId: mmsOpts.serviceId
          }
        );
      });

      test('on a non-dual sim setup with a different serviceId', function() {
        Settings.hasSeveralSim.returns(false);
        Settings.mmsServiceId = 1;

        MessageManager.sendMMS(mmsOpts);

        var smil = SMIL.generate.firstCall.returnValue;

        sinon.assert.calledWithExactly(
          MockNavigatormozMobileMessage.sendMMS,
          {
            receivers: ['123'],
            subject: null,
            smil: smil.smil,
            attachments: smil.attachments
          }, undefined);
      });

      test('serviceId is a string containing a number', function() {
        mmsOpts.serviceId = '0';
        Settings.mmsServiceId = 0;

        MessageManager.sendMMS(mmsOpts);

        sinon.assert.calledWith(
          MockNavigatormozMobileMessage.sendMMS,
          sinon.match.any, { serviceId: 0 }
        );
      });

      test('serviceId is a bad string', function() {
        mmsOpts.serviceId = 'hjuoriut';
        Settings.mmsServiceId = 0;

        MessageManager.sendMMS(mmsOpts);

        sinon.assert.calledWithExactly(
          MockNavigatormozMobileMessage.sendMMS,
          sinon.match.any, undefined
        );
      });
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

  suite('markMessagesRead()', function() {
    var messageIds;

    setup(function() {
      this.sinon.spy(MockNavigatormozMobileMessage, 'markMessageRead');
      messageIds = [1, 2, 3];

      MessageManager.markMessagesRead(messageIds);
    });

    test('properly mark all ids as read', function() {
      while (MockNavigatormozMobileMessage.mTriggerMarkReadSuccess()) {
      }

      sinon.assert.callCount(MockNavigatormozMobileMessage.markMessageRead, 3);
      messageIds.forEach(function(id) {
        sinon.assert.calledWith(
          MockNavigatormozMobileMessage.markMessageRead, id
        );
      });
    });

    test('output an error if there is an error', function() {
      this.sinon.stub(console, 'error');
      MockNavigatormozMobileMessage.mTriggerMarkReadError('UnknownError');
      assert.isTrue(
        console.error.firstCall.args.some(
          (arg) => typeof arg === 'string' && arg.contains('UnknownError')
        )
      );
    });
  });

  suite('resendMessage() >', function() {
    setup(function() {
      this.sinon.stub(MessageManager, 'deleteMessage');
    });

    test('fails if message is not passed', function() {
      assert.throws(function() {
        MessageManager.resendMessage({
          onsuccess: function() {}
        });
      });
    });

    suite('SMS message', function() {
      var resendParameters;
      setup(function() {
        resendParameters = {
          message: MockMessages.sms({
            iccId: 100
          }),
          onsuccess: sinon.stub(),
          onerror: sinon.stub()
        };
      });

      test('uses message iccId to retrieve service Id in case of multiple SIMs',
      function() {
        var serviceId = 3;

        this.sinon.stub(Settings, 'hasSeveralSim').returns(true);
        this.sinon.stub(Settings, 'getServiceIdByIccId').returns(serviceId);

        MessageManager.resendMessage(resendParameters);

        sinon.assert.calledWith(
          Settings.getServiceIdByIccId,
          resendParameters.message.iccId
        );
        sinon.assert.calledWith(
          MockNavigatormozMobileMessage.send,
          sinon.match.any, sinon.match.any, {
            serviceId: serviceId
          }
        );
      });

      test('correctly sends message', function() {
        MessageManager.resendMessage(resendParameters);

        sinon.assert.calledWithExactly(
          MockNavigatormozMobileMessage.send,
          resendParameters.message.receiver, resendParameters.message.body,
          undefined
        );
      });

      test('deletes old message on success and calls callback', function() {
        MessageManager.resendMessage(resendParameters);

        MockNavigatormozMobileMessage.mTriggerSmsOnSuccess();

        sinon.assert.called(resendParameters.onsuccess);
        sinon.assert.notCalled(resendParameters.onerror);
        sinon.assert.calledWith(
          MessageManager.deleteMessage,
          resendParameters.message.id
        );
      });

      test('deletes old message on error and calls callback', function() {
        MessageManager.resendMessage(resendParameters);

        MockNavigatormozMobileMessage.mTriggerSmsOnError();

        sinon.assert.notCalled(resendParameters.onsuccess);
        sinon.assert.called(resendParameters.onerror);
        sinon.assert.calledWith(
          MessageManager.deleteMessage,
          resendParameters.message.id
        );
      });
    });

    suite('MMS message', function() {
      var resendParameters;
      setup(function() {
        resendParameters = {
          message: MockMessages.mms({
            iccId: 100
          }),
          onsuccess: sinon.stub(),
          onerror: sinon.stub()
        };
      });

      test('uses message iccId to retrieve service Id in case of multiple SIMs',
      function() {
        var serviceId = 3;

        this.sinon.stub(Settings, 'hasSeveralSim').returns(true);
        this.sinon.stub(Settings, 'getServiceIdByIccId').returns(serviceId);

        MessageManager.resendMessage(resendParameters);

        sinon.assert.calledWith(
          Settings.getServiceIdByIccId,
          resendParameters.message.iccId
        );
        sinon.assert.calledWith(
          MockNavigatormozMobileMessage.sendMMS,
          sinon.match.any, {
            serviceId: serviceId
          }
        );
      });

      test('correctly sends message', function() {
        MessageManager.resendMessage(resendParameters);

        sinon.assert.calledWithExactly(
          MockNavigatormozMobileMessage.sendMMS, {
            receivers: resendParameters.message.receivers,
            subject: resendParameters.message.subject,
            smil: resendParameters.message.smil,
            attachments: resendParameters.message.attachments
          },
          undefined
        );
      });

      test('deletes old message on success and calls callback', function() {
        MessageManager.resendMessage(resendParameters);

        MockNavigatormozMobileMessage.mTriggerMmsOnSuccess();

        sinon.assert.called(resendParameters.onsuccess);
        sinon.assert.notCalled(resendParameters.onerror);
        sinon.assert.calledWith(
          MessageManager.deleteMessage,
          resendParameters.message.id
        );
      });

      test('deletes old message on error and calls callback', function() {
        MessageManager.resendMessage(resendParameters);

        MockNavigatormozMobileMessage.mTriggerMmsOnError();

        sinon.assert.notCalled(resendParameters.onsuccess);
        sinon.assert.called(resendParameters.onerror);
        sinon.assert.calledWith(
          MessageManager.deleteMessage,
          resendParameters.message.id
        );
      });
    });
  });


  suite('onDeliverySuccess', function() {
    suiteSetup(function() {
      this.mockEvent = {
        message : {
          id : 1
        }
      };
    });

    setup(function() {
      this.sinon.spy(ThreadUI, 'onDeliverySuccess');
      this.sinon.stub(ReportView, 'onDeliverySuccess');
    });

    test('calls the appropriate views', function() {
      MessageManager.onDeliverySuccess(this.mockEvent);
      sinon.assert.calledWith(ThreadUI.onDeliverySuccess,
        this.mockEvent.message);
      sinon.assert.calledWith(ReportView.onDeliverySuccess,
        this.mockEvent.message);
    });
  });

  suite('onReadSuccess', function() {
    suiteSetup(function() {
      this.mockEvent = {
        message : {
          id : 1
        }
      };
    });

    setup(function() {
      this.sinon.spy(ThreadUI, 'onReadSuccess');
      this.sinon.stub(ReportView, 'onReadSuccess');
    });

    test('calls the appropriate views', function() {
      MessageManager.onReadSuccess(this.mockEvent);
      sinon.assert.calledWith(ThreadUI.onReadSuccess,
        this.mockEvent.message);
      sinon.assert.calledWith(ReportView.onReadSuccess,
        this.mockEvent.message);
    });
  });
});
