/*global bridge,
         MockNavigatormozMobileMessage,
         MocksHelper,
         MozMobileMessageShim,
         Utils
*/

'use strict';

require('/services/js/moz_mobile_message/moz_mobile_message_shim.js');
require('/services/test/unit/mock_bridge.js');
require('/services/test/unit/mock_navigatormoz_sms.js');
require('/views/shared/js/utils.js');

var MocksHelperForAttachment = new MocksHelper([
  'bridge'
]).init();

suite('MozMobileMessageShim >', function() {
  const EVENTS = ['received', 'sending', 'sent', 'failed', 'deleted',
                  'readsuccess', 'deliverysuccess'];

  const METHODS = ['getMessage', 'retrieveMMS', 'send', 'sendMMS',
                   'delete', 'markMessageRead', 'getSegmentInfoForText'];

  const STREAMS = ['getThreads', 'getMessages'];

  var serviceStub;

  MocksHelperForAttachment.attachTestHelpers();

  suiteSetup(function() {
    serviceStub = sinon.stub({
      method: () => {},
      stream: () => {},
      broadcast: () => {}
    });

    sinon.stub(bridge, 'service').returns(serviceStub);
    sinon.stub(MockNavigatormozMobileMessage, 'addEventListener');
  });

  setup(function() {
    MozMobileMessageShim.init(MockNavigatormozMobileMessage);
  });

  test('bridge service is correctly initialized', function() {
    sinon.assert.calledOnce(bridge.service);
    sinon.assert.calledWith(bridge.service, 'mozMobileMessageShim');
  });

  test('event listener is correctly initialized', function() {
    EVENTS.forEach((event) => {
      sinon.assert.calledWith(
        MockNavigatormozMobileMessage.addEventListener,
        event,
        MozMobileMessageShim[Utils.camelCase(`on-${event}`)]
      );
    });
  });

  test('method mapping is correctly initialized', function() {
    METHODS.forEach((shimMethod) => {
      sinon.assert.calledWith(
        serviceStub.method,
        shimMethod,
        MozMobileMessageShim[shimMethod]
      );
    });
  });

  test('stream mapping is correctly initialized', function() {
    STREAMS.forEach((shimStream) => {
      sinon.assert.calledWith(
        serviceStub.stream,
        shimStream,
        MozMobileMessageShim[shimStream]
      );
    });
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
      this.sinon.spy(MockNavigatormozMobileMessage, 'retrieveMMS');
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

    test('retrieveMMS', function() {
      var args = [1];

      assert.equal(
        MozMobileMessageShim.retrieveMMS(...args),
        MockNavigatormozMobileMessage.retrieveMMS.firstCall.returnValue
      );
      sinon.assert.calledWith(
        MockNavigatormozMobileMessage.retrieveMMS,
        ...args
      );
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
        cursor = {};
        this.sinon.stub(MockNavigatormozMobileMessage, 'getThreads');
      });

      test('continue', function() {
        MockNavigatormozMobileMessage.getThreads.returns(cursor);
        MozMobileMessageShim.getThreads(streamStub);
        cursor.result = {};
        cursor.continue = sinon.stub();
        cursor.onsuccess();
        
        sinon.assert.calledWith(streamStub.write, cursor.result);
        sinon.assert.called(cursor.continue);
      });

      test('done', function() {
        MockNavigatormozMobileMessage.getThreads.returns(cursor);
        MozMobileMessageShim.getThreads(streamStub);
        cursor.result = null;
        cursor.onsuccess();
        
        sinon.assert.called(streamStub.close);
      });

      test('error while retrieving threads', function() {
        this.sinon.spy(console, 'error');
        MockNavigatormozMobileMessage.getThreads.throws('retrieving error');
        MozMobileMessageShim.getThreads(streamStub);

        sinon.assert.calledWith(
          console.error,
          'Error occurred while retrieving threads: retrieving error'
        );
        sinon.assert.called(streamStub.abort);          
      });

      test('error while reading the database', function() {
        MockNavigatormozMobileMessage.getThreads.returns(cursor);
        MozMobileMessageShim.getThreads(streamStub);
        cursor.error = { name: 'fake error' };
        this.sinon.spy(console, 'error');
        cursor.onerror();

        sinon.assert.calledWith(
          console.error,
          'Reading the database. Error: fake error'
        );
        sinon.assert.called(streamStub.abort);  
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
