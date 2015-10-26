'use strict';
/* global eventSafety */

require('/shared/js/event_safety.js');

suite('eventSafety: callback variant >', function() {

  teardown(function() {
    // Try to trigger the event again by firing the event and ticking the
    // clock. An error will be thrown if done is called multiple times.
    this.sinon.clock.tick(1000);
    window.dispatchEvent(new CustomEvent('foobar'));
  });

  test('fires after event', function(done) {
    this.sinon.useFakeTimers();
    eventSafety(window, 'foobar', function() {
      assert.ok(true, 'callback fired by event');
      done();
    }, 1000);
    window.dispatchEvent(new CustomEvent('foobar'));
  });

  test('fires after setTimeout', function(done) {
    this.sinon.useFakeTimers();
    eventSafety(window, 'foobar', function() {
      assert.ok(true, 'callback fired by setTimeout');
      done();
    }, 1000);
    this.sinon.clock.tick(1000);
  });

  test('passes on event argument', function(done) {
    this.sinon.useFakeTimers();
    eventSafety(window, 'foobar', function(evt) {
      assert.ok(evt, 'got event argument');
      assert.equal(evt.type, 'foobar', 'event name is set');
      done();
    }, 1000);
    window.dispatchEvent(new CustomEvent('foobar'));
  });

  function testBubblingEvent(eventName) {
    test(`filters mismatched elements for ${eventName} events`, function() {
      this.sinon.useFakeTimers();
      var called = false;
      var timeoutSpy = this.sinon.spy(window, 'setTimeout');
      eventSafety(window, 'foobar', function() {
        called = true;
      }, 1000);

      // Get the private callback and execute with arguments.
      timeoutSpy.getCall(0).args[0]({
        type: eventName,
        target: document.body // (Not what we called `eventSafety` with)
      });

      assert.equal(called, false, 'should not call the callback');
      this.sinon.clock.tick(1000);
      assert.equal(called, true, 'called after timeout');
    });
  }

  testBubblingEvent('transitionend');
  testBubblingEvent('animationend');

});


suite('eventSafety: promise variant >', function() {

  teardown(function() {
    // Try to trigger the event again by firing the event and ticking the
    // clock. An error will be thrown if done is called multiple times.
    this.sinon.clock.tick(1000);
    window.dispatchEvent(new CustomEvent('foobar'));
  });

  test('fires after event', function(done) {
    this.sinon.useFakeTimers();
    eventSafety(window, 'foobar', 1000).then(function() {
      assert.ok(true, 'callback fired by event');
      done();
    });
    window.dispatchEvent(new CustomEvent('foobar'));
  });

  test('fires after setTimeout', function(done) {
    this.sinon.useFakeTimers();
    eventSafety(window, 'foobar', 1000).then(function() {
      assert.ok(true, 'callback fired by setTimeout');
      done();
    });
    this.sinon.clock.tick(1000);
  });

  test('passes on event argument', function(done) {
    this.sinon.useFakeTimers();
    eventSafety(window, 'foobar', 1000).then(function(evt) {
      assert.ok(evt, 'got event argument');
      assert.equal(evt.type, 'foobar', 'event name is set');
      done();
    });
    window.dispatchEvent(new CustomEvent('foobar'));
  });

  function testBubblingEvent(eventName) {
    test(`filters mismatched elements for ${eventName} events`, function(done) {
      this.sinon.useFakeTimers();
      var called = false;
      var timeoutSpy = this.sinon.spy(window, 'setTimeout');
      eventSafety(window, 'foobar', 1000).then(function() {
        called = true;
      });

      // Get the private callback and execute with arguments.
      timeoutSpy.getCall(0).args[0]({
        type: eventName,
        target: document.body // (Not what we called `eventSafety` with)
      });

      assert.equal(called, false, 'should not call the callback');
      this.sinon.clock.tick(1000);
      // NOTE: Executing in the next Promise tick so that our Promise callback
      // has a chance to fire.
      Promise.resolve().then(() => {
        assert.equal(called, true, 'called after timeout');
      }).then(() => { done(); }, done);
    });
  }

  testBubblingEvent('transitionend');
  testBubblingEvent('animationend');

});
