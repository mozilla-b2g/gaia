/* global MinuteClockSource */
'use strict';

/**
 * To test if MinuteClockSource can really register the events and forward to
 * the target handler.
 **/
requireApp('system/lockscreen/js/source/source_event.js');
requireApp('system/lockscreen/js/source/minute_clock_source.js');

suite('MinuteClockSource > ', function() {

  test(`MinuteClockSource is a source fire the event every [interval]`,
  function() {
    var clock = sinon.useFakeTimers();
    var stubForwardTo = sinon.stub();
    var source = new MinuteClockSource({
      type: 'dummy-ticking'
    });
    // Fake clock would stub the clock and make it as at the second 0
    // of this minute, so it would wait 60 seconds to set the timeout.
    source.start(stubForwardTo);
    clock.tick(100);
    assert.isTrue(stubForwardTo.calledOnce,
      `it doesn't wait 0 seconds to start ticking`);
    clock.tick(60000);
    assert.isTrue(stubForwardTo.calledTwice,
      `it doesn't tick after the #1 minute`);
    clock.tick(59000);
    assert.isFalse(stubForwardTo.calledThrice,
      `it ticks too more times before the #2 minute`);
    clock.tick(1000);
    assert.isTrue(stubForwardTo.calledThrice,
      `it doesn't tick 3 times after the #2 minute`);
  });
});
