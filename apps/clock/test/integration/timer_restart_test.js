marionette('Timer Restarting', function() {
  'use strict';
  var assert = require('./lib/assert');
  var Timer = require('./lib/timer');
  var client = marionette.client();
  var timer;

  setup(function() {
    timer = new Timer(client);
    timer.launch();
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
  });

});
