suite('Timer', function() {
  var Timer, MockMozAlarm;
  var now, duration;

  suiteSetup(function(done) {
    testRequire(['timer', 'mocks/mock_moz_alarm'], {
      mocks: ['moz_alarm']
    }, function(timer, MozAlarm) {
      Timer = timer;
      MockMozAlarm = MozAlarm.MockMozAlarms;
      done();
    });
  });

  setup(function() {
    now = Date.now();
    duration = 5000;
    this.clock = this.sinon.useFakeTimers(Date.now());
  });

  test('shape:static ', function() {
    assert.equal(Timer.INITIAL, 0);
    assert.equal(Timer.STARTED, 1);
    assert.equal(Timer.PAUSED, 2);
  });

  function getTimer() {
    return new Timer({
      configuredDuration: duration
    });
  }

  test('start new timer ', function() {
    var stored;
    var timer = getTimer();
    timer.start();
    this.clock.tick(200);
    assert.equal(timer.state, Timer.STARTED);
    assert.equal(timer.remaining, duration - 200);
  });

  test('reactivate an un-paused timer ', function() {
    var stored;
    var timer = getTimer();

    timer.start();
    this.clock.tick(200);

    timer.start();
    this.clock.tick(200);
    timer.start();

    assert.equal(timer.state, Timer.STARTED);
    assert.equal(timer.remaining, duration - 400);
  });

  test('pause timer', function() {
    var timer = getTimer();

    timer.start();
    this.clock.tick(200);

    timer.pause();
    assert.equal(timer.state, Timer.PAUSED);
  });

  test('reactivate a paused timer ', function() {
    var timer = getTimer();

    timer.start();
    this.clock.tick(200);

    timer.pause();
    assert.equal(timer.state, Timer.PAUSED);

    this.clock.tick(200);
    timer.start();

    assert.equal(timer.state, Timer.STARTED);
    assert.equal(timer.remaining, duration - 200);
  });


  test('cancel ', function() {
    var timer = getTimer();

    timer.start();
    this.clock.tick(200);

    timer.cancel();
    assert.equal(timer.state, Timer.INITIAL);
  });

  test('plus ', function() {
    var timer = getTimer();
    var originalDuration = timer.duration;

    timer.plus(60);

    assert.equal(timer.duration, originalDuration + (60 * 1000));
  });

  suite('commit', function() {
    setup(function() {
      this.sinon.stub(navigator, 'mozAlarms', new MockMozAlarm());
      this.addSpy = this.sinon.spy(navigator.mozAlarms, 'add');
      this.removeSpy = this.sinon.spy(navigator.mozAlarms, 'remove');
      this.timer = getTimer();
    });
    suite('timers without alarms', function() {
      test('when in initial state', function(done) {
        this.timer.commit(function() {
          assert.equal(
            this.addSpy.callCount, 0, 'does not create a new alarm'
          );
          assert.equal(this.removeSpy.callCount, 0, 'does not remove alarm');
          done();
        }.bind(this));
        this.clock.tick(10);
      });
      test('when started', function(done) {
        this.timer.start();
        this.timer.commit(function() {
          assert.equal(this.addSpy.callCount, 1, 'creates a new alarm');
          assert.equal(this.removeSpy.callCount, 0, 'does not remove alarm');
          done();
        }.bind(this));
        this.clock.tick(10);
      });
    });

    suite('timers with previously-created alarms', function() {
      setup(function(done) {
        // Ensure that the timer is in a saved state and the spies are reset
        this.timer.start();
        this.timer.commit(function() {
          this.addSpy.reset();
          this.removeSpy.reset();
          this.origTimerId = this.timer.id;

          // Return timer to initial state
          this.timer.cancel();

          done();
        }.bind(this));
        this.clock.tick(10);
      });

      test('when in initial state', function(done) {
        this.timer.commit(function() {
          assert.equal(
            this.addSpy.callCount, 0, 'does not create a new alarm'
          );
          assert.equal(
            this.removeSpy.args[0][0], this.origTimerId, 'removes old alarm'
          );
          done();
        }.bind(this));
        this.clock.tick(10);
      });
      test('when started', function(done) {
        this.timer.start();
        this.timer.commit(function() {
          assert.equal(
            this.addSpy.callCount, 1, 'creates a new alarm'
          );
          assert.equal(
            this.removeSpy.args[0][0], this.origTimerId, 'removes old alarm'
          );
          done();
        }.bind(this));
        this.clock.tick(10);
      });
    });
  });

  suite('Timer.remaining ', function() {
    test('Initial time', function() {
      var timer = getTimer();
      timer.configuredDuration = 7200;
      assert.equal(timer.remaining, 7200,
        'Expected remaining time to equal configured time.');
    });
    test('Paused time', function() {
      var timer = getTimer();
      timer.start();
      this.clock.tick(200);
      timer.pause();
      this.clock.tick(200);
      assert.equal(timer.remaining, 4800,
        'Expected paused time to be 4.8 seconds');
    });
    test('Started time', function() {
      var timer = getTimer();
      timer.start();
      this.clock.tick(300);
      assert.equal(timer.remaining, 4700,
        'Expected started time to be 4.7 seconds');
    });
  });
});
