marionette('Stopwatch', function() {
  'use strict';

  var assert = require('assert');
  var actions = new (require('../lib/actions'))();
  var stopwatch = actions.stopwatch;

  setup(function() {
    actions.launch('stopwatch');
  });

  test('Stopwatch Resetting', function() {
    stopwatch
      .start()
      .lap()
      .lap()
      .pause();

    assert.equal(actions.stopwatch.laps.length, 3);
    // During pause, the reset button should be usable.
    assert.ok(actions.isButtonUsable('.stopwatch-reset'));

    stopwatch.reset();

    // After reset, start should be usable, reset should not.
    assert.ok(!actions.isButtonUsable('.stopwatch-reset'));
    assert.ok(actions.isButtonUsable('.stopwatch-start'));

    // Everything should be gone.
    assert.equal(stopwatch.duration, 0);
    assert.equal(stopwatch.laps.length, 0);
  });

  test('Stopwatch Advancement', function() {
    assert.equal(stopwatch.duration, 0);

    stopwatch.start();

    stopwatch.advanceTime(1300);
    assert.ok(!actions.isButtonUsable('.stopwatch-start'));
    assert.ok(stopwatch.duration > 1200);
  });

  test('Lap advancement and ordering', function() {

    stopwatch
      .start()
      .lap();

    assert.equal(stopwatch.laps.length, 2);
    assert.ok(stopwatch.laps[0].duration > 0);
    assert.ok(stopwatch.laps[1].duration > 0);

    var originalLaps = stopwatch.laps;

    stopwatch.advanceTime(1300);
    stopwatch.lap();

    var newLaps = stopwatch.laps;

    // New laps should be inserted first.
    assert.ok(newLaps[0].duration < newLaps[1].duration);
    // Old laps should preserve their state.
    assert.ok(newLaps[1].duration >= originalLaps[0].duration);
    assert.equal(newLaps[2].duration, originalLaps[1].duration);
  });

  test('Max Laps', function() {
    var MAX = 5;
    stopwatch
      .setMaxLaps(MAX)
      .start();

    for (var i = 0; i < MAX - 1; i++) {
      stopwatch.lap();
    }

    assert.ok(!actions.isButtonUsable('.stopwatch-lap'));
  });

});
