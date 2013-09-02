marionette('Timer Panel', function() {
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

  test('pausing and restarting', function() {
    var pausedValue;

    timer.setDuration(0, 20);
    timer.start();

    timer.pause();
    pausedValue = timer.readCountdown();

    client.helper.wait(1200);

    assert.equal(
      pausedValue,
      timer.readCountdown(),
      'Timer does not advance after being paused'
    );

    timer.resume();

    client.helper.wait(1200);

    assert.notEqual(
      pausedValue,
      timer.readCountdown(),
      'Timer advances after being unpaused'
    );

    timer.cancel();

    assert.equal(timer.getDuration(), 0);
  });

});
