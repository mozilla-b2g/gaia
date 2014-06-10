/*global
        MessageManager,
        MockNavigatormozMobileMessage,
        MocksHelper,
        MockMessages,
        Settings,
        SMIL,
        Threads
*/

'use strict';
require('/js/event_dispatcher.js');

require('/test/unit/mock_messages.js');
require('/test/unit/mock_navigatormoz_sms.js');
require('/test/unit/mock_settings.js');
require('/test/unit/mock_smil.js');
require('/test/unit/mock_threads.js');

require('/js/utils.js');
require('/test/unit/mock_utils.js');

require('/js/message_manager.js');

var mocksHelperForMessageManager = new MocksHelper([
  'Settings',
  'SMIL',
  'Threads',
  'Utils'
]).init();

suite('message_manager.js >', function() {

  mocksHelperForMessageManager.attachTestHelpers();
  var realMozMobileMessage;

  setup(function() {
    realMozMobileMessage = navigator.mozMobileMessage;
    navigator.mozMobileMessage = MockNavigatormozMobileMessage;

    this.sinon.stub(MockNavigatormozMobileMessage, 'addEventListener');
    this.sinon.spy(MockNavigatormozMobileMessage, 'send');
    this.sinon.spy(MockNavigatormozMobileMessage, 'sendMMS');
    this.sinon.spy(Threads, 'registerMessage');

    MessageManager.init();
  });

  teardown(function() {
    navigator.mozMobileMessage = realMozMobileMessage;

    MessageManager.offAll();

    MessageManager.initialized = false;
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

      var filter = { threadId: 1 };

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
      this.sinon.stub(MessageManager, 'deleteMessages');
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
          MessageManager.deleteMessages,
          resendParameters.message.id
        );
      });

      test('deletes old message on error and calls callback', function() {
        MessageManager.resendMessage(resendParameters);

        MockNavigatormozMobileMessage.mTriggerSmsOnError();

        sinon.assert.notCalled(resendParameters.onsuccess);
        sinon.assert.called(resendParameters.onerror);
        sinon.assert.calledWith(
          MessageManager.deleteMessages,
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
          MessageManager.deleteMessages,
          resendParameters.message.id
        );
      });

      test('deletes old message on error and calls callback', function() {
        MessageManager.resendMessage(resendParameters);

        MockNavigatormozMobileMessage.mTriggerMmsOnError();

        sinon.assert.notCalled(resendParameters.onsuccess);
        sinon.assert.called(resendParameters.onerror);
        sinon.assert.calledWith(
          MessageManager.deleteMessages,
          resendParameters.message.id
        );
      });
    });
  });

  suite('Dispatched events >', function() {
    test(' onMessageSent, onMessageFailedToSend, onMessageDelivered,' +
         ' onMessageRead >', function () {
      // Map for Messaging API events that just dispatched further without any
      // logic and processing.
      var eventsMap = new Map();

      eventsMap.set('sent', 'message-sent');
      eventsMap.set('failed', 'message-failed-to-send');
      eventsMap.set('deliverysuccess', 'message-delivered');
      eventsMap.set('readsuccess', 'message-read');

      eventsMap.forEach(function(eventName, messagingApiEvent) {
        var handler = sinon.stub(),
            message = { id: 100 };

        MessageManager.on(eventName, handler);

        MockNavigatormozMobileMessage.addEventListener.
          withArgs(messagingApiEvent).yield({
            message: message
          });

        sinon.assert.calledWith(handler, {
          message: message
        });

        MessageManager.off(eventName, handler);
      });
    });

    suite('onMessageSending >', function() {
      test('registers message being sent with Threads object', function() {
        var handler = sinon.stub(),
            message = { id: 100 };

        MessageManager.on('message-sending', handler);

        MockNavigatormozMobileMessage.addEventListener.withArgs('sending').
          yield({
            message: message
          });

        sinon.assert.calledWith(handler, {
          message: message
        });
        sinon.assert.calledWith(Threads.registerMessage, message);
      });
    });

    suite('onMessageReceived >', function() {
      test('does not dispatch "message-received" for class-0 message',
      function() {
        var handler = sinon.stub();

        var class0Message = {
          id: 100,
          messageClass: 'class-0'
        };

        var class1Message = {
          id: 200,
          messageClass: 'class-1'
        };

        var messageWithoutClass = {
          id: 300
        };

        MessageManager.on('message-received', handler);

        MockNavigatormozMobileMessage.addEventListener.withArgs('received').
          yield({
            message: class0Message
          });

        // Should not be called if class-0 message received
        sinon.assert.notCalled(handler);
        sinon.assert.notCalled(Threads.registerMessage);

        MockNavigatormozMobileMessage.addEventListener.withArgs('received').
          yield({
            message: class1Message
          });

        // Should be called for any other class of messages
        sinon.assert.calledWith(handler, { message: class1Message });
        sinon.assert.calledWith(Threads.registerMessage, class1Message);

        MockNavigatormozMobileMessage.addEventListener.withArgs('received').
          yield({
            message: messageWithoutClass
          });

        // Should be called for messages without class
        sinon.assert.calledWith(handler, { message: messageWithoutClass });
        sinon.assert.calledWith(Threads.registerMessage, messageWithoutClass);
      });

      test('does not dispatch "message-received" for messages being downloaded',
      function() {
        var handler = sinon.stub();

        var pendingMessage = {
          id: 100,
          delivery: 'not-downloaded',
          deliveryInfo: [{
            deliveryStatus: 'pending'
          }]
        };

        var messageFailedToDownload = {
          id: 100,
          delivery: 'not-downloaded',
          deliveryInfo: [{
            deliveryStatus: 'failed'
          }]
        };

        MessageManager.on('message-received', handler);

        MockNavigatormozMobileMessage.addEventListener.withArgs('received').
          yield({
            message: pendingMessage
          });

        // Should not be called for not downloaded, but pending message
        sinon.assert.notCalled(handler);
        sinon.assert.notCalled(Threads.registerMessage);

        MockNavigatormozMobileMessage.addEventListener.withArgs('received').
          yield({
            message: messageFailedToDownload
          });

        // Should be called for other not downloaded cases
        sinon.assert.calledWith(handler, { message: messageFailedToDownload });
        sinon.assert.calledWith(
          Threads.registerMessage,
          messageFailedToDownload
        );
      });
    });

    suite('onDeleted >', function() {
      test('does not dispatch "threads-deleted"', function() {
        var unexpectedHandler = sinon.stub();

        MessageManager.on('threads-deleted', unexpectedHandler);

        var variousParameters = [{}, {
          deletedThreadIds: null
        }, {
          deletedThreadIds: []
        }, {
          deletedMessageIds: null
        }, {
          deletedMessageIds: []
        }, {
          deletedThreadIds: null,
          deletedMessageIds: null
        }, {
          deletedThreadIds: [],
          deletedMessageIds: []
        }];

        variousParameters.forEach(
          (parameters) => MockNavigatormozMobileMessage.addEventListener.
            withArgs('deleted').yield(parameters)
        );

        sinon.assert.notCalled(unexpectedHandler);
      });

      test('dispatches "threads-deleted"', function() {
        var expectedHandler = sinon.stub();

        MessageManager.on('threads-deleted', expectedHandler);

        MockNavigatormozMobileMessage.addEventListener.withArgs('deleted').
          yield({
            deletedThreadIds : [1, 2],
            deletedMessageIds: []
          });

        sinon.assert.calledOnce(expectedHandler);
        sinon.assert.calledWith(expectedHandler, {
          ids: [1, 2]
        });
      });
    });
  });

  suite('getSegmentInfo()', function() {
    var subject = 'some text',
        messageManagerMozMobileMessage;

    setup(function() {
      messageManagerMozMobileMessage = MessageManager._mozMobileMessage;
    });

    teardown(function() {
      MessageManager._mozMobileMessage = messageManagerMozMobileMessage;
    });

    test('returns a rejected promise if there is no API', function(done) {
      MessageManager._mozMobileMessage = undefined;

      MessageManager.getSegmentInfo(subject).then(
        function() {
          throw new Error(
            'getSegmentInfo returned a resolved promise, ' +
            'but a rejected promise was expected.'
          );
        }, function(err) {
          assert.instanceOf(err, Error);
        }
      ).then(done, done);
    });

    test('returns a resolved promise with the returned value', function(done) {
      var expected = {
        segments: 1,
        charsAvailableInLastSegment: 20
      };

      MessageManager.getSegmentInfo(subject).then(
        function(result) {
          assert.deepEqual(result, expected);
        }
      ).then(done, done);

      MockNavigatormozMobileMessage.mTriggerSegmentInfoSuccess(expected);
    });

    test('returns a rejected promise if there is an error', function(done) {
      MessageManager.getSegmentInfo(subject).then(
        function() {
          throw new Error(
            'getSegmentInfo returned a resolved promise, ' +
            'but a rejected promise was expected.'
          );
        }, function(error) {
          assert.ok(error.name);
        }
      ).then(done, done);

      MockNavigatormozMobileMessage.mTriggerSegmentInfoError();
    });
  });
});
