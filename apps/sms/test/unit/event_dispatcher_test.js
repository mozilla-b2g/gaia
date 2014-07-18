/*global EventDispatcher */

'use strict';

require('/js/event_dispatcher.js');

suite('EventDispatcher >', function() {
  var originalObject = {
    property: 3,
    method: () => {}
  };

  var eventTarget = null;

  suiteSetup(function() {
    eventTarget = EventDispatcher.mixin(originalObject);
  });

  suite('mixin >', function() {
    test('throws if object to mix into is not valid object', function() {
      assert.throws(() => EventDispatcher.mixin());
      assert.throws(() => EventDispatcher.mixin(null));
      assert.throws(() => EventDispatcher.mixin(() => {}));
      assert.throws(() => EventDispatcher.mixin(3));
    });

    test('correctly adds methods to target object', function() {
      assert.equal(typeof eventTarget.on, 'function');
      assert.equal(typeof eventTarget.off, 'function');
      assert.equal(typeof eventTarget.offAll, 'function');
      assert.equal(typeof eventTarget.trigger, 'function');

      assert.strictEqual(eventTarget, originalObject);
      assert.strictEqual(eventTarget.method, originalObject.method);
      assert.strictEqual(eventTarget.property, originalObject.property);
    });
  });

  suite('on >', function() {
    setup(function() {
      eventTarget.offAll('event');
    });

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

      eventTarget.trigger('event');
      sinon.assert.calledOnce(expectedHandler);

      eventTarget.trigger('event');
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

      eventTarget.trigger('event');

      sinon.assert.notCalled(unexpectedHandler);
      sinon.assert.calledOnce(expectedHandler1);
      sinon.assert.calledOnce(expectedHandler2);
      sinon.assert.callOrder(expectedHandler1, expectedHandler2);
    });
  });

  suite('off >', function() {
    setup(function() {
      eventTarget.offAll('event');
    });

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
      eventTarget.trigger('event');

      sinon.assert.calledOnce(handler);

      eventTarget.off('event', handler);
      eventTarget.trigger('event');

      sinon.assert.calledOnce(handler);
    });

    test('unregisters correct handler', function() {
      var handler1 = sinon.stub(),
          handler2 = sinon.stub(),
          handler3 = sinon.stub();

      eventTarget.on('event', handler1);
      eventTarget.on('event', handler2);
      eventTarget.trigger('event');

      sinon.assert.calledOnce(handler1);
      sinon.assert.calledOnce(handler2);

      eventTarget.off('event', handler3);
      eventTarget.trigger('event');

      sinon.assert.calledTwice(handler1);
      sinon.assert.calledTwice(handler2);

      eventTarget.off('event', handler1);
      eventTarget.trigger('event');

      sinon.assert.calledTwice(handler1);
      sinon.assert.calledThrice(handler2);

      eventTarget.off('event', handler2);
      eventTarget.trigger('event');

      sinon.assert.calledTwice(handler1);
      sinon.assert.calledThrice(handler2);
    });
  });

  suite('offAll >', function() {
    setup(function() {
      eventTarget.offAll('event');
    });

    test('throws if event name is not valid string', function() {
      assert.throws(() => eventTarget.offAll());
      assert.throws(() => eventTarget.offAll(''));
      assert.throws(() => eventTarget.offAll(null));
    });

    test('successfully unregisters all handlers', function() {
      var handler1 = sinon.stub(),
          handler2 = sinon.stub();

      eventTarget.on('event', handler1);
      eventTarget.on('event', handler2);
      eventTarget.trigger('event');

      sinon.assert.calledOnce(handler1);
      sinon.assert.calledOnce(handler2);

      eventTarget.offAll('other-event');
      eventTarget.trigger('event');

      sinon.assert.calledTwice(handler1);
      sinon.assert.calledTwice(handler2);

      eventTarget.offAll('event');
      eventTarget.trigger('event');

      sinon.assert.calledTwice(handler1);
      sinon.assert.calledTwice(handler2);
    });
  });

  suite('trigger >', function() {
    setup(function() {
      eventTarget.offAll('event');
      eventTarget.offAll('other-event');
      eventTarget.offAll('event-1');
    });

    test('throws if event name is not valid string', function() {
      assert.throws(() => eventTarget.trigger());
      assert.throws(() => eventTarget.trigger('', {}));
      assert.throws(() => eventTarget.trigger(null, {}));
    });

    test('execute all handlers in the right order', function() {
      var expectedHandler1 = sinon.stub(),
          expectedHandler2 = sinon.stub(),
          unexpectedHandler = sinon.stub();

      eventTarget.on('event', expectedHandler1);
      eventTarget.on('event', expectedHandler2);
      eventTarget.on('other-event', unexpectedHandler);

      eventTarget.trigger('event');

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

      eventTarget.trigger('event', parameters1);
      eventTarget.trigger('event-1', parameters2);
      eventTarget.trigger('other-event');

      sinon.assert.calledWith(handler1, parameters1);
      sinon.assert.calledWith(handler2, parameters2);
      sinon.assert.calledWith(handler3, undefined);
    });

    test('execute all handlers even if exeption occurs', function() {
      var handler1 = sinon.stub().throws('Type Error'),
          handler2 = sinon.stub();

      eventTarget.on('event', handler1);
      eventTarget.on('event', handler2);

      eventTarget.trigger('event');

      sinon.assert.calledOnce(handler1);
      sinon.assert.calledOnce(handler2);
      sinon.assert.callOrder(handler1, handler2);
    });
  });
});
