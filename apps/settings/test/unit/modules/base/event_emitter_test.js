'use strict';

suite('EventEmitter', function() {
  suiteSetup(function(done) {
    testRequire(['modules/base/event_emitter'], (EventEmitter) => {
      this.EventEmitter = EventEmitter;
      done();
    });
  });

  suite('constructor', function() {
    test('should have an array for each event', function() {
      var emitter = this.EventEmitter(['event1', 'event2']);
      assert.isArray(emitter._eventListeners.event1);
      assert.isArray(emitter._eventListeners.event2);
    });

    test('should throw when no valid event names', function() {
      assert.throw(() => {
        this.EventEmitter();
      }, Error, 'no valid registered events');
    });
  });

  suite('addEventListener', function() {
    setup(function() {
      this.emitter = this.EventEmitter(['event1', 'event2']);
    });

    suite('should call to the listener when emitting the event', function() {
      test('register a function', function() {
        var listener = sinon.spy();
        this.emitter.addEventListener('event1', listener);
        this.emitter._emitEvent('event1', 'value1');
        sinon.assert.calledWith(listener, sinon.match({ 
          type: 'event1',
          detail: 'value1'
        }));
      });

      test('register an object', function() {
        var eventHandler = {
          handleEvent: sinon.spy()
        };
        this.emitter.addEventListener('event1', eventHandler);
        this.emitter._emitEvent('event1', 'value1');
        sinon.assert.calledWith(eventHandler.handleEvent, sinon.match({ 
          type: 'event1',
          detail: 'value1'
        }));
      });

      test('should only call once when registering multiple times', function() {
        var listener = sinon.spy();
        this.emitter.addEventListener('event1', listener);
        this.emitter.addEventListener('event1', listener);
        this.emitter.addEventListener('event1', listener);
        this.emitter.addEventListener('event1', listener);
        this.emitter._emitEvent('event1', 'value1');
        sinon.assert.calledWith(listener, sinon.match({ 
          type: 'event1',
          detail: 'value1'
        }));
        sinon.assert.calledOnce(listener);
      });
    });
  });

  suite('removeEventListener', function() {
    setup(function() {
      this.emitter = this.EventEmitter(['event1', 'event2']);
    });

    suite('should not call to the listener when it is removed', function() {
      test('the listener is a function', function() {
        var listener = sinon.spy();
        this.emitter.addEventListener('event1', listener);
        this.emitter._emitEvent('event1', 'value1');
        sinon.assert.calledOnce(listener);
        this.emitter.removeEventListener('event1', listener);
        this.emitter._emitEvent('event1', 'value1');
        sinon.assert.calledOnce(listener);
      });

      test('the listener is an object', function() {
        var eventHandler = {
          handleEvent: sinon.spy()
        };
        this.emitter.addEventListener('event1', eventHandler);
        this.emitter._emitEvent('event1', 'value1');
        sinon.assert.calledOnce(eventHandler.handleEvent);
        this.emitter.removeEventListener('event1', eventHandler);
        this.emitter._emitEvent('event1', 'value1');
        sinon.assert.calledOnce(eventHandler.handleEvent);
      });
    });
  });
});
