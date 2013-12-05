marionette('Lap creation', function() {
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

    // Ensure that at least one centisecond has passed on the device before
    // continuing.
    client.helper.wait(11);

    laps = stopwatch.readLaps();

    assert.equal(
      laps.length,
      2,
      'Stopwatch displays element for "current" lap and each lap created'
    );

    assert.hasDuration(
      laps[0],
      [1, Infinity],
      '"Current" lap entry contains nonzero time'
    );

    assert.hasDuration(laps[1],
      [1, Infinity],
      'Immediately-created lap entry contains nonzero time'
    );

    client.helper.wait(1300);

    stopwatch.lap();

    laps = stopwatch.readLaps();

    assert.hasDuration(
      laps[0],
      [0, Infinity],
      'New laps are inserted at the beginning of the lap list'
    );

    assert.hasDuration(
      laps[1],
      [1200, Infinity],
      'Previously-created lap entries persist'
    );

    assert.hasDuration(laps[2],
      [1, Infinity],
      'Previously-created lap entries persist'
    );
  });
});
