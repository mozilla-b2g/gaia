marionette('Stopwatch Panel', function() {
  var assert = require('./lib/assert');
  var Stopwatch = require('./lib/stopwatch');
  var client = marionette.client();
  var stopwatch;

  setup(function() {
    stopwatch = new Stopwatch(client);
    stopwatch.launch();
  });

  test('basic operation', function() {
    assert.hasDuration(
      stopwatch.read(),
      0,
      'Initialize with zero duration'
    );

    stopwatch.start();
    assert(
      !stopwatch.isButtonUsable('start'),
      'Start button is not usable while stopwatch advances'
    );

    client.helper.wait(1200);

    assert.hasDuration(
      stopwatch.read(),
      [1200, 1600]
    );
  });

  test('lap creation', function() {
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
      'Stopwatch displays element for each lap created'
    );

    assert.hasDuration(
      laps[0],
      [1, 300],
      '"Current" lap entry contains nonzero time'
    );

    assert.hasDuration(laps[1],
      [1, 300],
      'Immediately-created lap entry contains nonzero time'
    );

    client.helper.wait(1200);

    stopwatch.lap();

    laps = stopwatch.readLaps();

    assert.hasDuration(
      laps[0],
      [0, 200],
      'New laps are inserted at the beginning of the lap list'
    );

    assert.hasDuration(
      laps[1],
      [1200, 1600],
      'New laps are inserted at the beginning of the lap list'
    );

    assert.hasDuration(laps[2],
      [0, 200],
      'Previously-created lap entries persist'
    );
  });

  test('resetting', function() {
    stopwatch.start();

    stopwatch.lap();
    stopwatch.lap();

    assert.equal(
      stopwatch.readLaps().length,
      3,
      'Stopwatch displays element for each lap created'
    );

    stopwatch.pause();

    stopwatch.reset();

    assert(
      !stopwatch.isButtonUsable('reset'),
      'Reset button is not usable after stopwatch has been reset'
    );
    assert.equal(
      stopwatch.readLaps().length,
      0,
      'Laps are removed'
    );

  });

});
