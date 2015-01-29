/* global TimerSource */
'use strict';

/**
 * To test if TimerSource can really register the events and forward to
 * the target handler.
 **/
requireApp('system/lockscreen/js/source/source_event.js');
requireApp('system/lockscreen/js/source/timer_source.js');

suite('TimerSource > ', function() {

  test(`TimerSource is a source fire the event every [interval]`,
  function() {
    var clock = sinon.useFakeTimers();
    var stubForwardTo = sinon.stub();
    var source = new TimerSource({
      type: 'foo',
      interval: 100,
      times: 2
    });
    source.start(stubForwardTo);
    clock.tick(100);
    assert.isTrue(stubForwardTo.calledOnce);
    clock.tick(100);
    assert.isTrue(stubForwardTo.calledTwice);
    clock.tick(100);
    assert.isFalse(stubForwardTo.calledThrice);
  });

  test(`If no [times] TimerSource.timer would not stop to fire the event`,
  function() {
    var clock = sinon.useFakeTimers();
    var stubForwardTo = sinon.stub();
    var source = new TimerSource({
      type: 'foo',
      interval: 100
    });
    source.start(stubForwardTo);
    clock.tick(100);
    assert.isTrue(stubForwardTo.calledOnce);
    clock.tick(100);
    assert.isTrue(stubForwardTo.calledTwice);
    clock.tick(100);
    assert.isTrue(stubForwardTo.calledThrice);
  });

  test(`If [times] is 1 TimerSource.timer would fire the event once`,
  function() {
    var clock = sinon.useFakeTimers();
    var stubForwardTo = sinon.stub();
    var source = new TimerSource({
      type: 'foo',
      interval: 100,
      times: 1
    });
    source.start(stubForwardTo);
    clock.tick(100);
    assert.isTrue(stubForwardTo.calledOnce);
    clock.tick(100);
    assert.isFalse(stubForwardTo.calledTwice);
    clock.tick(100);
    assert.isFalse(stubForwardTo.calledThrice);
  });

  test(`Even if no [times] to stop it would stil clear the timer`,
  function() {
    var clock = sinon.useFakeTimers();
    var stubForwardTo = sinon.stub();
    var source = new TimerSource({
      type: 'foo',
      interval: 100
    });
    source.start(stubForwardTo);
    clock.tick(100);
    assert.isTrue(stubForwardTo.calledOnce);
    clock.tick(100);
    assert.isTrue(stubForwardTo.calledTwice);
    source.stop();    // This should stop the timer.
    clock.tick(100);
    assert.isFalse(stubForwardTo.calledThrice);
  });
});
