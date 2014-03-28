marionette('Timer', function() {
  'use strict';

  var assert = require('assert');
  var actions = new (require('./lib/actions'))();
  var timer = actions.timer;

  setup(function() {
    actions.launch('timer');
  });

  test('Basic Timer Operation', function() {
    var durationMs = (6 * 60 + 40) * 60 * 1000;
    timer.hours = 6;
    timer.minutes = 40;

    timer.start();

    timer.advanceTime(500);

    assert.ok(timer.countdown > durationMs - 5000);
    assert.ok(timer.countdown <= durationMs);

    // Switch away from the timer tab and back.
    // The timer should still show an appropriate countdown.
    actions.openTab('alarm');
    actions.openTab('timer');

    assert.ok(timer.countdown > durationMs - 10000);
    assert.ok(timer.countdown <= durationMs);
  });

  test('Timer Pausing and Restarting', function() {
    timer.hours = 0;
    timer.minutes = 20;

    timer.start();
    timer.pause();

    var pausedValue = timer.countdown;
    timer.advanceTime(1200);

    // The timer should not advance while paused.
    assert.equal(timer.countdown, pausedValue);

    timer.resume();
    timer.advanceTime(1200);

    // The timer should advance when unpaused.
    assert.ok(timer.countdown < pausedValue);
  });

});
