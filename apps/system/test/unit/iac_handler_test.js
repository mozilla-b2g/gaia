'use strict';

mocha.globals(['dispatchEvent']);

require('/shared/js/iac_handler.js');

var MockMozSetMessageHandler_listeners = {};
function MockMozSetMessageHandler(event, listener) {
  MockMozSetMessageHandler_listeners[event] = listener;
}

suite('IACHandler > ', function() {

  var realMozSetMessageHandler;
  var spyDispatchEvent;

  var FakePort = function() {};
  FakePort.prototype.postMessage = function(e) {
    this.onmessage.call(this, e);
  };

  suiteSetup(function() {
    realMozSetMessageHandler = navigator.mozSetMessageHandler;
    navigator.mozSetMessageHandler = MockMozSetMessageHandler;

    spyDispatchEvent = sinon.spy(window, 'dispatchEvent');
    IACHandler.init();
  });

  suiteTeardown(function() {
    navigator.mozSetMessageHandler = realMozSetMessageHandler;
    spyDispatchEvent.restore();
  });

  suite('connect to mediacomms', function() {
    var request;
    var fakePort = new FakePort;

    setup(function() {

      request = {
        keyword: 'mediacomms',
        port: fakePort
      };

      // pretend Gecko call this event somewhere
      MockMozSetMessageHandler_listeners['connection'](request);
    });

    test('IACHandler can send to mediacomms successfully', function() {
      var message = {
        type: 'appinfo',
        data: true
      };

      fakePort.postMessage({
        data: message
      });
      assert.deepEqual(spyDispatchEvent.lastCall.args[0].detail, message);
    });
  });

  suite('connect to ftucomms', function() {
    var request;
    var fakePort = new FakePort;

    setup(function() {

      request = {
        keyword: 'ftucomms',
        port: fakePort
      };

      // pretend Gecko call this event somewhere
      MockMozSetMessageHandler_listeners['connection'](request);
    });

    test('IACHandler can send to mediacomms successfully', function() {
      var message = {
        type: 'ftudone',
        data: true
      };

      fakePort.postMessage({
        data: message
      });

      assert.deepEqual(spyDispatchEvent.lastCall.args[0].detail, message);
    });
  });

  suite('IACHandler can store ports', function() {

    test('IACHandler has two ports', function() {
      assert.equal(Object.keys(IACHandler._ports).length, 2);
    });

    test('IACHandler.getPort() return undefined', function() {
      assert.isUndefined(IACHandler.getPort());
    });

    test('IACHandler.getPort(\'ftucomms\') return port', function() {
      assert.isObject(IACHandler.getPort('ftucomms'));
    });

    test('IACHandler.getPort(\'mediacomms\') return port', function() {
      assert.isObject(IACHandler.getPort('mediacomms'));
    });
  });
});
