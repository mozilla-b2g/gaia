marionette('Timer Starting', function() {
  var assert = require('./lib/assert');
  var Timer = require('./lib/timer');
  var client = marionette.client();
  var timer;

  setup(function() {
    timer = new Timer(client);
    timer.launch();
  });

  test('basic operation', function() {
    var durationMs = (6 * 60 + 40) * 60 * 1000;

    timer.setDuration(6, 40);

    timer.start();

    // This assertion is intentionally fuzzy to allow for time passage between
    // alarm creation and the following "read" operation.
    assert.hasDuration(
      timer.readCountdown(),
      [durationMs - 3000, durationMs],
      'displays the correct time immediately after creation'
    );

    timer.navigate('alarm');
    timer.navigate('timer');
    assert.hasDuration(
      timer.readCountdown(),
      [durationMs - 3000, durationMs],
      'maintains the correct time across panel naviations'
    );
  });

});
