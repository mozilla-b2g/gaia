/*global EventDispatcher,
        Set
*/

'use strict';

require('/shared/js/event_dispatcher.js');

suite('EventDispatcher >', function() {
  var originalObject = {
    property: 3,
    method: () => {}
  };

  var originalRestrictedObject = {
    property: 3,
    method: () => {}
  };

  var allowedEvents = ['allowed-event-1', 'allowed-event-2'];

  var eventTarget = null,
      restrictedEventTarget = null;

  suiteSetup(function() {
    eventTarget = EventDispatcher.mixin(originalObject);
    restrictedEventTarget = EventDispatcher.mixin(
      originalRestrictedObject,
      allowedEvents
    );
  });

  teardown(function() {
    eventTarget.offAll();
  });

  suite('mixin >', function() {
    test('throws if object to mix into is not valid object', function() {
      assert.throws(() => EventDispatcher.mixin());
      assert.throws(() => EventDispatcher.mixin(null));
      assert.throws(() => EventDispatcher.mixin(() => {}));
      assert.throws(() => EventDispatcher.mixin(3));
    });

    test('throws if object to mix into already has dispatcher methods',
    function() {
      var CustomClass = function() {};
      EventDispatcher.mixin(CustomClass.prototype);

      assert.throws(() => EventDispatcher.mixin({ on: () => {} }));
      assert.throws(() => EventDispatcher.mixin({ on: null }));
      assert.throws(() => EventDispatcher.mixin({ off: () => {} }));
      assert.throws(() => EventDispatcher.mixin({ off: 'day off' }));
      assert.throws(() => EventDispatcher.mixin({ offAll: () => {} }));
      assert.throws(() => EventDispatcher.mixin({ emit: () => {} }));
      assert.throws(() => EventDispatcher.mixin(new CustomClass()));
      assert.throws(() => EventDispatcher.mixin(EventDispatcher.mixin({})));
    });

    test('throws if invalid array is passed for allowedEvents', function() {
      assert.throws(() => EventDispatcher.mixin({}, null));
      assert.throws(() => EventDispatcher.mixin({}, 'event'));
      assert.throws(() => EventDispatcher.mixin({}, new Set()));
    });

    test('correctly adds methods to target object', function() {
      assert.equal(typeof eventTarget.on, 'function');
      assert.equal(typeof eventTarget.off, 'function');
      assert.equal(typeof eventTarget.offAll, 'function');
      assert.equal(typeof eventTarget.emit, 'function');

      assert.strictEqual(eventTarget, originalObject);
      assert.strictEqual(eventTarget.method, originalObject.method);
      assert.strictEqual(eventTarget.property, originalObject.property);
    });
  });

  suite('on >', function() {
    test('throws if event name is not valid string', function() {
      assert.throws(() => eventTarget.on());
      assert.throws(() => eventTarget.on('', () => {}));
      assert.throws(() => eventTarget.on(null, () => {}));
    });

    test('throws if handler is not function', function() {
      assert.throws(() => eventTarget.on('event'));
      assert.throws(() => eventTarget.on('event', null));
      assert.throws(() => eventTarget.on('event', {}));
    });

    test('successfully registers handler', function() {
      var expectedHandler = sinon.stub(),
          unexpectedHandler = sinon.stub();

      eventTarget.on('not-expected-event', unexpectedHandler);
      eventTarget.on('event', expectedHandler);

      eventTarget.emit('event');
      sinon.assert.calledOnce(expectedHandler);

      eventTarget.emit('event');
      sinon.assert.calledTwice(expectedHandler);
      sinon.assert.notCalled(unexpectedHandler);
    });

    test('successfully registers multiple handlers', function() {
      var expectedHandler1 = sinon.stub(),
          expectedHandler2 = sinon.stub(),
          unexpectedHandler = sinon.stub();

      eventTarget.on('not-expected-event', unexpectedHandler);
      eventTarget.on('event', expectedHandler1);
      eventTarget.on('event', expectedHandler2);

      eventTarget.emit('event');

      sinon.assert.notCalled(unexpectedHandler);
      sinon.assert.calledOnce(expectedHandler1);
      sinon.assert.calledOnce(expectedHandler2);
      sinon.assert.callOrder(expectedHandler1, expectedHandler2);
    });

    suite('with allowed events >', function() {
      test('throws if event name is not allowed', function() {
        assert.throws(() => restrictedEventTarget.on('event'));
      });

      test('successfully registers handler for allowed event', function() {
        var expectedHandler = sinon.stub(),
            unexpectedHandler = sinon.stub();

        restrictedEventTarget.on('allowed-event-2', unexpectedHandler);
        restrictedEventTarget.on('allowed-event-1', expectedHandler);

        restrictedEventTarget.emit('allowed-event-1');
        sinon.assert.calledOnce(expectedHandler);

        restrictedEventTarget.emit('allowed-event-1');
        sinon.assert.calledTwice(expectedHandler);
        sinon.assert.notCalled(unexpectedHandler);
      });
    });
  });

  suite('off >', function() {
    test('throws if event name is not valid string', function() {
      assert.throws(() => eventTarget.off());
      assert.throws(() => eventTarget.off('', () => {}));
      assert.throws(() => eventTarget.off(null, () => {}));
    });

    test('throws if handler is not function', function() {
      assert.throws(() => eventTarget.off('event'));
      assert.throws(() => eventTarget.off('event', null));
      assert.throws(() => eventTarget.off('event', {}));
    });

    test('successfully unregisters handler', function() {
      var handler = sinon.stub();

      eventTarget.on('event', handler);
      eventTarget.emit('event');

      sinon.assert.calledOnce(handler);

      eventTarget.off('event', handler);
      eventTarget.emit('event');

      sinon.assert.calledOnce(handler);
    });

    test('unregisters correct handler', function() {
      var handler1 = sinon.stub(),
          handler2 = sinon.stub(),
          handler3 = sinon.stub();

      eventTarget.on('event', handler1);
      eventTarget.on('event', handler2);
      eventTarget.emit('event');

      sinon.assert.calledOnce(handler1);
      sinon.assert.calledOnce(handler2);

      eventTarget.off('event', handler3);
      eventTarget.emit('event');

      sinon.assert.calledTwice(handler1);
      sinon.assert.calledTwice(handler2);

      eventTarget.off('event', handler1);
      eventTarget.emit('event');

      sinon.assert.calledTwice(handler1);
      sinon.assert.calledThrice(handler2);

      eventTarget.off('event', handler2);
      eventTarget.emit('event');

      sinon.assert.calledTwice(handler1);
      sinon.assert.calledThrice(handler2);
    });

    suite('with allowed events >', function() {
      test('throws if event name is not allowed', function() {
        assert.throws(() => restrictedEventTarget.off('event'));
      });

      test('successfully unregisters handler for allowed event', function() {
         var handler = sinon.stub();

        restrictedEventTarget.on('allowed-event-1', handler);
        restrictedEventTarget.emit('allowed-event-1');

        sinon.assert.calledOnce(handler);

        restrictedEventTarget.off('allowed-event-1', handler);
        restrictedEventTarget.emit('allowed-event-1');

        sinon.assert.calledOnce(handler);
      });
    });
  });

  suite('offAll >', function() {
    test('throws if event name is not valid string', function() {
      assert.throws(() => eventTarget.offAll(''));
      assert.throws(() => eventTarget.offAll(null));
    });

    test('unregisters all handlers for a specific event', function() {
      var handler1 = sinon.stub(),
          handler2 = sinon.stub();

      eventTarget.on('event', handler1);
      eventTarget.on('event', handler2);
      eventTarget.emit('event');

      sinon.assert.calledOnce(handler1);
      sinon.assert.calledOnce(handler2);

      eventTarget.offAll('other-event');
      eventTarget.emit('event');

      sinon.assert.calledTwice(handler1);
      sinon.assert.calledTwice(handler2);

      eventTarget.offAll('event');
      eventTarget.emit('event');

      sinon.assert.calledTwice(handler1);
      sinon.assert.calledTwice(handler2);
    });

    test('unregisters all handlers for all events', function() {
      var handler1 = sinon.stub();
      var handler2 = sinon.stub();
      var handler3 = sinon.stub();

      eventTarget.on('event-1', handler1);
      eventTarget.on('event-1', handler2);
      eventTarget.on('event-2', handler3);

      eventTarget.offAll();
      eventTarget.emit('event-1');
      eventTarget.emit('event-2');

      sinon.assert.notCalled(handler1);
      sinon.assert.notCalled(handler2);
      sinon.assert.notCalled(handler3);
    });

    suite('with allowed events >', function() {
      test('throws if event name is not allowed', function() {
        assert.throws(() => restrictedEventTarget.offAll('event'));
      });

      test('successfully unregisters all handlers for allowed event',
      function() {
        var handler1 = sinon.stub(),
          handler2 = sinon.stub();

        restrictedEventTarget.on('allowed-event-1', handler1);
        restrictedEventTarget.on('allowed-event-1', handler2);
        restrictedEventTarget.emit('allowed-event-1');

        sinon.assert.calledOnce(handler1);
        sinon.assert.calledOnce(handler2);

        restrictedEventTarget.offAll('allowed-event-2');
        restrictedEventTarget.emit('allowed-event-1');

        sinon.assert.calledTwice(handler1);
        sinon.assert.calledTwice(handler2);

        restrictedEventTarget.offAll('allowed-event-1');
        restrictedEventTarget.emit('allowed-event-1');

        sinon.assert.calledTwice(handler1);
        sinon.assert.calledTwice(handler2);
      });
    });
  });

  suite('emit >', function() {
    test('throws if event name is not valid string', function() {
      assert.throws(() => eventTarget.emit());
      assert.throws(() => eventTarget.emit('', {}));
      assert.throws(() => eventTarget.emit(null, {}));
    });

    test('execute all handlers in the right order', function() {
      var expectedHandler1 = sinon.stub(),
          expectedHandler2 = sinon.stub(),
          unexpectedHandler = sinon.stub();

      eventTarget.on('event', expectedHandler1);
      eventTarget.on('event', expectedHandler2);
      eventTarget.on('other-event', unexpectedHandler);

      eventTarget.emit('event');

      sinon.assert.notCalled(unexpectedHandler);
      sinon.assert.calledOnce(expectedHandler1);
      sinon.assert.calledOnce(expectedHandler2);
      sinon.assert.callOrder(expectedHandler1, expectedHandler2);
    });

    test('passes correct parameters to the handlers', function() {
      var handler1 = sinon.stub(),
          handler2 = sinon.stub(),
          handler3 = sinon.stub();

      var parameters1 = {
        id: 1
      };

      var parameters2 = 'hello!';

      eventTarget.on('event', handler1);
      eventTarget.on('event-1', handler2);
      eventTarget.on('other-event', handler3);

      eventTarget.emit('event', parameters1);
      eventTarget.emit('event-1', parameters2);
      eventTarget.emit('other-event');

      sinon.assert.calledWith(handler1, parameters1);
      sinon.assert.calledWith(handler2, parameters2);
      sinon.assert.calledWith(handler3, undefined);
    });

    test('execute all handlers even if exception occurs', function() {
      var handler1 = sinon.stub().throws('Type Error'),
          handler2 = sinon.stub();

      eventTarget.on('event', handler1);
      eventTarget.on('event', handler2);

      eventTarget.emit('event');

      sinon.assert.calledOnce(handler1);
      sinon.assert.calledOnce(handler2);
      sinon.assert.callOrder(handler1, handler2);
    });

    suite('with allowed events >', function() {
      test('throws if event name is not allowed', function() {
        assert.throws(() => restrictedEventTarget.emit('event'));
      });

      test('execute all handlers for allowed event in the right order',
      function() {
        var expectedHandler1 = sinon.stub(),
            expectedHandler2 = sinon.stub(),
            unexpectedHandler = sinon.stub();

        restrictedEventTarget.on('allowed-event-1', expectedHandler1);
        restrictedEventTarget.on('allowed-event-1', expectedHandler2);
        restrictedEventTarget.on('allowed-event-2', unexpectedHandler);

        restrictedEventTarget.emit('allowed-event-1');

        sinon.assert.notCalled(unexpectedHandler);
        sinon.assert.calledOnce(expectedHandler1);
        sinon.assert.calledOnce(expectedHandler2);
        sinon.assert.callOrder(expectedHandler1, expectedHandler2);
      });
    });
  });
});
