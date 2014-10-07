'use strict';
/* global MockEventTarget */

require('/shared/test/unit/mocks/mock_event_target.js');

suite('MockEventTarget', function() {
  test('dispatchEvent()', function(done) {
    var eventTarget = new MockEventTarget();
    var count = 5;

    var fooEvent = {
      type: 'foo'
    };

    var handleFoos = function handleFoos(evt) {
      assert.equal(evt, fooEvent, 'evt === fooEvent');
      assert.equal(fooEvent.target, eventTarget,
        'fooEvent.target === eventTarget');

      count--;
      if (!count) {
        done();
      }
    };
    var fooCallback = function fooCallback(evt) {
      assert.equal(this, eventTarget, 'this == eventTarget');
      handleFoos(evt);
    };
    var fooEventListener = {
      handleEvent: function fooCallback(evt) {
        assert.equal(
          this, fooEventListener, 'this == fooEventListener');
        handleFoos(evt);
      }
    };

    var fooCallbackToRemove = function() {
      assert.isTrue(false, 'Must not fire removed event handler.');
    };

    var fooEventListenerToRemove = {
      handleEvent: fooCallbackToRemove
    };

    var barCallback = function(evt) {
      assert.isTrue(false, 'Must not fire error event.');
    };

    eventTarget.onfoo = fooCallback;
    eventTarget.addEventListener('foo', fooCallback);
    eventTarget.addEventListener('foo', fooCallback, true);
    eventTarget.addEventListener('foo', fooEventListener);
    eventTarget.addEventListener('foo', fooEventListener, true);

    eventTarget.addEventListener('foo', fooCallbackToRemove);
    eventTarget.addEventListener('foo', fooCallbackToRemove, true);
    eventTarget.addEventListener('foo', fooEventListenerToRemove);
    eventTarget.addEventListener('foo', fooEventListenerToRemove, true);
    eventTarget.removeEventListener('foo', fooCallbackToRemove);
    eventTarget.removeEventListener('foo', fooCallbackToRemove, true);
    eventTarget.removeEventListener('foo', fooEventListenerToRemove);
    eventTarget.removeEventListener('foo', fooEventListenerToRemove, true);

    eventTarget.onbar = barCallback;
    eventTarget.addEventListener('bar', barCallback);
    eventTarget.addEventListener('bar', barCallback, true);
    eventTarget.addEventListener('bar', {
      handleEvent: barCallback
    });
    eventTarget.addEventListener('bar', {
      handleEvent: barCallback
    }, true);

    eventTarget.dispatchEvent(fooEvent);
  });
});
