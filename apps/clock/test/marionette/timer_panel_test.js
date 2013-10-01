marionette('Alarm Panel', function() {
  var assert = require('./lib/assert');
  var Timer = require('./lib/timer');
  var client = marionette.client();
  var timer;

  setup(function() {
    timer = new Timer(client);
    timer.launch();
  });

  test('basic operation', function() {
    var durationMs = 6 * 60 * 1000 * 1000 + 40 * 1000 * 1000 + 15 * 1000;

    timer.setDuration(6, 40, 15);
    timer.start();

    // This assertion is intentionally fuzzy to allow for time passage between
    // alarm creation and the following "read" operation.
    assert.hasDuration(
      timer.els.timer.countdown.text(),
      [durationMs - 5000, durationMs],
      'displays the correct time immediately after creation'
    );

    timer.navigate('alarm');
    timer.navigate('timer');
    assert.ok(
      timer.els.timer.countdown.text(),
      [durationMs - 5000, durationMs],
      'maintains the correct time across panel naviations'
    );
  });

  test('pausing and restarting', function(done) {
    var pausedValue;

    // This is a long-running test because it specifically requires the passage
    // of time to assert correct timer functionality
    this.timeout(40 * 1000);

    timer.setDuration(0, 20, 0);
    timer.start();

    timer.els.timer.pauseBtn.tap();
    pausedValue = timer.els.timer.countdown.text();

    setTimeout(function() {
      assert.equal(
        pausedValue,
        timer.els.timer.countdown.text(),
        'Timer does not advance after being paused'
      );

      timer.els.timer.resumeBtn.tap();

      setTimeout(function() {
        assert.notEqual(
          pausedValue,
          timer.els.timer.countdown.text(),
          'Timer advances after being paused'
        );

        timer.els.timer.cancelBtn.tap();

        // Ensure create timer form is eventually made visible
        client.waitFor(function() {
          return timer.els.timer.createBtn.displayed();
        });

        done();
      }, 1200);
    }, 1200);
  });

});
