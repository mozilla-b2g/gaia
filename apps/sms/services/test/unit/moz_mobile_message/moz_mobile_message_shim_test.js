/*global bridge,
         BroadcastChannel,
         MockNavigatormozMobileMessage,
         MocksHelper,
         MozMobileMessageShim,
         streamService
*/

'use strict';

require('/services/test/unit/mock_bridge.js');
require('/services/test/unit/mock_navigatormoz_sms.js');
require('/views/shared/test/unit/mock_broadcast_channel.js');
require('/views/shared/js/utils.js');
require('/services/js/bridge_service_mixin.js');
require('/services/js/moz_mobile_message/moz_mobile_message_shim.js');

var MocksHelperForAttachment = new MocksHelper([
  'bridge',
  'BroadcastChannel',
  'streamService'
]).init();

suite('MozMobileMessageShim >', function() {
  var serviceStub;

  const APP_ID = 'fake-app-id';

  MocksHelperForAttachment.attachTestHelpers();

  suiteSetup(function() {
    serviceStub = sinon.stub({
      method: () => {},
      stream: () => {},
      broadcast: () => {},
      plugin: () => {},
      listen: () => {}
    });

    sinon.spy(window, 'BroadcastChannel');
    sinon.stub(bridge, 'service').returns(serviceStub);
    sinon.stub(MockNavigatormozMobileMessage, 'addEventListener');
  });

  setup(function() {
    MozMobileMessageShim.init(APP_ID, MockNavigatormozMobileMessage);
  });

  test('bridge service is correctly initialized', function() {
    sinon.assert.calledOnce(bridge.service);
    sinon.assert.calledWith(bridge.service, 'moz-mobile-message-shim');
    sinon.assert.calledWith(serviceStub.plugin, streamService);
    sinon.assert.calledTwice(serviceStub.listen);
    sinon.assert.calledWith(
      serviceStub.listen,
      sinon.match.instanceOf(BroadcastChannel)
    );

    sinon.assert.calledWith(
      BroadcastChannel,
      'moz-mobile-message-shim-channel-' + APP_ID
    );
  });

  suite('event broadcast', function() {
    var messageEvent, deleteEvent, eventMap;

    setup(function() {
      messageEvent = { message: {} };
      deleteEvent = { deletedThreadIds: [1, 2, 3] };
      eventMap = new Map([
        ['sending', {
          apiEvent: messageEvent,
          broadcastEventName: 'message-sending',
          broadcastParameters: { message: messageEvent.message }
        }],
        ['failed', {
          apiEvent: messageEvent,
          broadcastEventName: 'message-failed-to-send',
          broadcastParameters: { message: messageEvent.message }
        }],
        ['deliverysuccess', {
          apiEvent: messageEvent,
          broadcastEventName: 'message-delivered',
          broadcastParameters: { message: messageEvent.message }
        }],
        ['readsuccess', {
          apiEvent: messageEvent,
          broadcastEventName: 'message-read',
          broadcastParameters: { message: messageEvent.message }
        }],
        ['sent', {
          apiEvent: messageEvent,
          broadcastEventName: 'message-sent',
          broadcastParameters: { message: messageEvent.message }
        }],
        ['deleted', {
          apiEvent: deleteEvent,
          broadcastEventName: 'threads-deleted',
          broadcastParameters: { ids: deleteEvent.deletedThreadIds }
        }]
      ]);
    });

    test('event broadcasted by service with correct parameter', function() {
      eventMap.forEach((eventDescription, apiEventName) => {
        MockNavigatormozMobileMessage.addEventListener
          .withArgs(apiEventName).yield(eventDescription.apiEvent);

        sinon.assert.calledWith(
          serviceStub.broadcast,
          eventDescription.broadcastEventName,
          eventDescription.broadcastParameters
        );
      });
    });
  });

  suite('methods for wrapping up API', function() {

    setup(function() {
      this.sinon.spy(MockNavigatormozMobileMessage, 'getMessage');
      this.sinon.stub(MockNavigatormozMobileMessage, 'retrieveMMS');
      this.sinon.spy(MockNavigatormozMobileMessage, 'send');
      this.sinon.spy(MockNavigatormozMobileMessage, 'sendMMS');
      this.sinon.spy(MockNavigatormozMobileMessage, 'markMessageRead');
      this.sinon.spy(MockNavigatormozMobileMessage, 'getSegmentInfoForText');
      MockNavigatormozMobileMessage.delete = sinon.stub();
    });

    test('getMessage', function() {
      var args = [1];

      assert.equal(
        MozMobileMessageShim.getMessage(...args),
        MockNavigatormozMobileMessage.getMessage.firstCall.returnValue
      );
      sinon.assert.calledWith(
        MockNavigatormozMobileMessage.getMessage,
        ...args
      );
    });

    suite('retrieveMMS', function() {
      var args;

      setup(function() {
        args = [1];
      });

      test('success', function() {
        MockNavigatormozMobileMessage.retrieveMMS.returns(Promise.resolve({
          id: 'fake message'
        }));
        MozMobileMessageShim.retrieveMMS(...args).then((result) => {
          assert.isTrue(result);
          sinon.assert.calledWith(
            MockNavigatormozMobileMessage.retrieveMMS,
            ...args
          );
        });
      });

      test('error', function() {
        var error = 'fakeError';
        MockNavigatormozMobileMessage.retrieveMMS.returns(
          Promise.reject(error)
        );
        MozMobileMessageShim.retrieveMMS(...args).catch((err) => {
          assert.equal(err, error);
          sinon.assert.calledWith(
            MockNavigatormozMobileMessage.retrieveMMS,
            ...args
          );
        });
      });
    });

    test('send', function() {
      var args = [['123'], 'body', {}];

      assert.equal(
        MozMobileMessageShim.send(...args),
        MockNavigatormozMobileMessage.send.firstCall.returnValue
      );
      sinon.assert.calledWith(MockNavigatormozMobileMessage.send, ...args);
    });

    test('sendMMS', function() {
      var args = [{}, {}];

      assert.equal(
        MozMobileMessageShim.sendMMS(...args),
        MockNavigatormozMobileMessage.sendMMS.firstCall.returnValue
      );
      sinon.assert.calledWith(MockNavigatormozMobileMessage.sendMMS, ...args);
    });

    test('delete', function() {
      var args = [1];

      assert.equal(
        MozMobileMessageShim.delete(...args),
        MockNavigatormozMobileMessage.delete.firstCall.returnValue
      );
      sinon.assert.calledWith(MockNavigatormozMobileMessage.delete, ...args);
    });

    test('markMessageRead', function() {
      var args = [1, true, {}];

      assert.equal(
        MozMobileMessageShim.markMessageRead(...args),
        MockNavigatormozMobileMessage.markMessageRead.firstCall.returnValue
      );
      sinon.assert.calledWith(
        MockNavigatormozMobileMessage.markMessageRead,
        ...args
      );
    });

    test('getSegmentInfoForText', function() {
      var args = ['body'];
      var mockAPI = MockNavigatormozMobileMessage.getSegmentInfoForText;

      assert.equal(
        MozMobileMessageShim.getSegmentInfoForText(...args),
        mockAPI.firstCall.returnValue
      );
      sinon.assert.calledWith(mockAPI, ...args);
    });
  });

  suite('streams for wrapping up API', function() {
    var streamStub;

    setup(function() {
      streamStub = sinon.stub({
        write: () => {},
        close: () => {},
        abort: () => {}
      });
    });

    suite('getThreads', function() {
      var cursor;

      setup(function() {
        cursor = {
          result:  {
            id: 1,
            body: 'body',
            participants: ['+1234'],
            timestamp: 0,
            unreadCount: 0,
            lastMessageType: 'sms'
          },

          continue: sinon.stub()
        };

        this.sinon.stub(MockNavigatormozMobileMessage, 'getThreads');
      });

      test('continue', function() {
        MockNavigatormozMobileMessage.getThreads.returns(cursor);
        MozMobileMessageShim.getThreads(streamStub);

        cursor.onsuccess();

        sinon.assert.calledWith(streamStub.write, cursor.result);
        sinon.assert.called(cursor.continue);
      });

      test('stream cancelled', function() {
        MockNavigatormozMobileMessage.getThreads.returns(cursor);
        MozMobileMessageShim.getThreads(streamStub);

        streamStub.cancel();

        cursor.onsuccess();

        sinon.assert.notCalled(streamStub.write);
        sinon.assert.notCalled(cursor.continue);
        sinon.assert.called(streamStub.close);
      });

      test('done', function() {
        MockNavigatormozMobileMessage.getThreads.returns(cursor);
        MozMobileMessageShim.getThreads(streamStub);
        cursor.result = null;
        cursor.onsuccess();

        sinon.assert.called(streamStub.close);
      });

      test('error while retrieving threads', function() {
        var error = new Error('retrieving error');

        this.sinon.spy(console, 'error');
        MockNavigatormozMobileMessage.getThreads.throws(error);
        MozMobileMessageShim.getThreads(streamStub);

        sinon.assert.calledWith(
          console.error, 'Error occurred while retrieving threads:', error
        );
        sinon.assert.calledWith(streamStub.abort, '[Error] retrieving error');
      });

      test('error while reading the database', function() {
        MockNavigatormozMobileMessage.getThreads.returns(cursor);
        MozMobileMessageShim.getThreads(streamStub);
        cursor.error = new Error('fake error');
        this.sinon.spy(console, 'error');
        cursor.onerror();

        sinon.assert.calledWith(
          console.error,
          'Error occurred while reading the database',
          cursor.error
        );
        sinon.assert.calledWith(streamStub.abort, '[Error] fake error');
      });
    });

    suite('getMessages', function() {
      var opts, cursor;

      setup(function() {
        opts = {
          invert: true,
          filter: {}
        };
        cursor = {};

        this.sinon.stub(MockNavigatormozMobileMessage, 'getMessages')
          .withArgs(opts.filter, !opts.invert).returns(cursor);
        MozMobileMessageShim.getMessages(streamStub, opts);
      });

      test('continue', function() {
        cursor.done = false;
        cursor.result = {};
        cursor.continue = sinon.stub();
        cursor.onsuccess();

        sinon.assert.calledWith(streamStub.write, cursor.result);
        sinon.assert.called(cursor.continue);
      });

      test('done', function() {
        cursor.done = true;
        cursor.onsuccess();

        sinon.assert.called(streamStub.close);
      });

      test('error', function() {
        cursor.error = { name: 'fake error' };
        this.sinon.spy(console, 'error');
        cursor.onerror();

        sinon.assert.calledWith(
          console.error,
          'Reading the database. Error: fake error'
        );
        sinon.assert.called(streamStub.abort);
      });

      test('cancel stream', function() {
        streamStub.cancel();

        sinon.assert.called(streamStub.close);
      });
    });
  });
});
