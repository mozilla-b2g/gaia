marionette('Alarm Panel', function() {
  var assert = require('./lib/assert');
  var Timer = require('./lib/timer');
  var client = marionette.client();
  var timer;

  setup(function() {
    timer = new Timer(client);
    timer.launch();
  });

  test('basic operation', function(done) {
    var pausedValue;
    // This is a long-running test because it
    // 1. involves programatically interacting with an imprecise input element
    // 2. specifically requires the passage of time to assert correct timer
    //    functionality
    this.timeout(40 * 1000);

    timer.setDuration(6, 40, 9);
    timer.start();

    // This assertion is intentionally fuzzy to allow for time passage between
    // alarm creation and the following "read" operation.
    assert.ok(
      /6:40[:\.]0[0-9]/.test(timer.els.timer.countdown.text()),
      'displays the correct time immediately after creation'
    );

    timer.navigate('alarm');
    timer.navigate('timer');
    assert.ok(
      /6:40[:\.]0[0-9]/.test(timer.els.timer.countdown.text()),
      'maintains the correct time across panel naviations'
    );

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
