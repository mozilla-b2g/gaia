marionette('Lap creation', function() {
  'use strict';
  var assert = require('./lib/assert');
  var Stopwatch = require('./lib/stopwatch');
  var client = marionette.client();
  var stopwatch;

  setup(function() {
    stopwatch = new Stopwatch(client);
    stopwatch.launch();
  });

  test('lap advancement and ordering', function() {
    var laps;

    assert.equal(
      stopwatch.readLaps(),
      0,
      'Stopwatch initially displays 0 laps'
    );

    stopwatch.start();

    stopwatch.lap();

    laps = stopwatch.readLaps();

    assert.equal(
      laps.length,
      2,
      'Stopwatch displays element for "current" lap and each lap created'
    );

    assert.hasDuration(
      laps[0],
      { lower: 1, upper: Infinity },
      '"Current" lap entry contains nonzero time'
    );

    assert.hasDuration(laps[1],
      { lower: 1, upper: Infinity },
      'Immediately-created lap entry contains nonzero time'
    );

    client.helper.wait(1300);

    stopwatch.lap();

    laps = stopwatch.readLaps();

    assert.hasDuration(
      laps[0],
      { lower: 0, upper: Infinity },
      'New laps are inserted at the beginning of the lap list'
    );

    assert.hasDuration(
      laps[1],
      { lower: 1200, upper: Infinity },
      'Previously-created lap entries persist'
    );

    assert.hasDuration(laps[2],
       { lower: 1, upper: Infinity },
      'Previously-created lap entries persist'
    );
  });
});
