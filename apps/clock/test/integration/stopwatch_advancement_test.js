marionette('Stopwatch advancement', function() {
  'use strict';
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

    client.helper.wait(1300);

    assert.hasDuration(
      stopwatch.read(),
      { lower: 1200, upper: Infinity }
    );
  });
});
