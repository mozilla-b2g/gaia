marionette('Stopwatch resetting', function() {
  'use strict';
  var assert = require('./lib/assert');
  var Stopwatch = require('./lib/stopwatch');
  var client = marionette.client();
  var stopwatch;

  setup(function() {
    stopwatch = new Stopwatch(client);
    stopwatch.launch();
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
    assert(
      stopwatch.isButtonUsable('start'),
      'Start button is re-enabled'
    );

    assert.equal(
      stopwatch.readLaps().length,
      0,
      'Laps are removed'
    );
    assert.hasDuration(
      stopwatch.read(),
      0,
      'Reset to zero duration'
    );
  });

});
