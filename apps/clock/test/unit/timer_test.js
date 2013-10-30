suite('Timer', function() {
  var Timer, asyncStroage;
  var al, now, startAt, endAt, duration;

  suiteSetup(function(done) {
    loadBodyHTML('/index.html');

    testRequire(['timer', 'mocks/mock_shared/js/async_storage'], {
      mocks: ['shared/js/async_storage']
    }, function(timer, mockAsyncStorage) {
      Timer = timer;
      asyncStorage = mockAsyncStorage;
      done();
    });
  });

  setup(function() {
    this.sinon.spy(asyncStorage, 'setItem');
    this.sinon.spy(asyncStorage, 'removeItem');

    now = Date.now();
    // ensure to start on a 000ms
    now -= (now % 1000);
    duration = 5000;
    startAt = now;
    endAt = now + duration;
    this.clock = this.sinon.useFakeTimers(startAt);
  });

  test('shape:prototype ', function() {
    assert.ok(Timer);
    assert.ok(Timer.prototype.start);
    assert.ok(Timer.prototype.pause);
    assert.ok(Timer.prototype.cancel);
    assert.ok(Timer.prototype.tick);
    assert.ok(Timer.prototype.notify);
  });

  test('shape:static ', function() {
    assert.equal(Timer.INITIALIZED, 0);
    assert.equal(Timer.STARTED, 1);
    assert.equal(Timer.PAUSED, 2);
    assert.equal(Timer.CANCELED, 3);
    assert.equal(Timer.REACTIVATING, 4);
  });

  test('shape:instance ', function() {
    var timer = new Timer({
      startAt: startAt,
      endAt: endAt
    });

    assert.equal(timer.startAt, startAt);
    assert.equal(timer.endAt, endAt);
    assert.equal(timer.pauseAt, 0);
    assert.equal(timer.duration, duration);
    assert.equal(timer.lapsed, 0);
    assert.equal(timer.state, Timer.INITIALIZED);
    assert.equal(timer.sound, null);
  });

  test('start new timer ', function() {
    var stored;
    var timer = new Timer({
      startAt: now,
      endAt: now + duration
    });

    this.sinon.spy(timer, 'tick');

    timer.start();

    assert.isTrue(timer.tick.called);
    assert.isTrue(asyncStorage.setItem.called);
    assert.equal(asyncStorage.setItem.args[0][0], 'active_timer');

    stored = JSON.parse(asyncStorage.setItem.args[0][1]);

    // The startAt and endAt time will have been
    // adjusted to ensure that they are correct when
    // the timer starts for the first time.
    // All we care about is that they are not zero
    assert.ok(stored.startAt);
    assert.ok(stored.endAt);

    assert.equal(stored.endAt - stored.startAt, duration);
    assert.equal(stored.duration, duration);

    assert.equal(stored.pauseAt, 0);
    assert.equal(stored.state, 1);
  });

  test('reactivate an un-paused timer ', function() {
    var stored;
    var timer = new Timer({
      startAt: startAt,
      endAt: endAt,
      pauseAt: 0,
      duration: duration,
      state: Timer.STARTED
    });
    this.sinon.spy(timer, 'tick');

    // Reactivating a timer that was in STARTED state
    // will be put the timer into REACTIVATING state until
    // its start method is called.
    assert.equal(timer.state, Timer.REACTIVATING);

    timer.start();

    assert.isTrue(timer.tick.called);
    assert.isTrue(asyncStorage.setItem.called);
    assert.equal(asyncStorage.setItem.args[0][0], 'active_timer');

    stored = JSON.parse(asyncStorage.setItem.args[0][1]);

    // The startAt and endAt time will have been
    // adjusted to ensure that they are correct when
    // the timer starts for the first time.
    // All we care about is that they are not zero
    assert.ok(stored.startAt);
    assert.ok(stored.endAt);

    assert.equal(stored.endAt - stored.startAt, duration);
    assert.equal(stored.duration, duration);

    assert.equal(stored.pauseAt, 0);
    assert.equal(stored.state, 1);
  });

  test('reactivate a paused timer ', function() {
    var stored;
    var timer = new Timer({
      startAt: startAt,
      endAt: endAt,
      pauseAt: endAt - 3000,
      duration: duration,
      state: Timer.PAUSED
    });

    this.sinon.spy(timer, 'tick');

    timer.start();

    assert.isTrue(timer.tick.called);
    assert.isTrue(asyncStorage.setItem.called);
    assert.equal(asyncStorage.setItem.args[1][0], 'active_timer');

    stored = JSON.parse(asyncStorage.setItem.args[1][1]);

    // The startAt and endAt time will have been
    // adjusted to ensure that they are correct when
    // the timer starts for the first time.
    // All we care about is that they are not zero
    assert.ok(stored.startAt);
    assert.ok(stored.endAt);

    // pause will have been reset to 0
    assert.equal(stored.pauseAt, 0);
    assert.equal(stored.duration, duration);
    assert.equal(stored.state, 1);
  });

  test('tick ', function(done) {
    var isCalled = false;
    var timer = new Timer({
      startAt: startAt,
      endAt: endAt
    });

    timer.on('tick', function(remaining) {
      // wait for lapsed to be updated at least 1 second
      if (timer.lapsed > 1 && !isCalled) {
        isCalled = true;
        assert.ok(remaining);
        assert.isTrue(asyncStorage.setItem.called);
        done();
      }
    });

    timer.start();
    this.clock.tick(duration);
  });

  test('tick to end ', function(done) {
    var timer = new Timer({
      startAt: startAt,
      endAt: endAt
    });

    this.sinon.spy(timer, 'cancel');
    this.sinon.spy(timer, 'notify');

    timer.on('end', function() {
      assert.isTrue(timer.cancel.called);
      assert.isTrue(timer.notify.called);
      assert.isTrue(asyncStorage.removeItem.called);
      done();
    });

    timer.start();
    this.clock.tick(duration - 1);

    assert.isFalse(timer.cancel.called);
    this.clock.tick(1);
    assert.isTrue(timer.cancel.called);
  });

  test('pause ', function() {
    var timer = new Timer({
      startAt: startAt,
      endAt: endAt
    });
    timer.start();

    timer.pause();

    assert.ok(timer.pauseAt);
    assert.equal(timer.state, Timer.PAUSED);
    assert.isTrue(asyncStorage.setItem.called);
  });

  test('pause and resume (#927330)', function() {
    var timer = new Timer({
      startAt: startAt,
      endAt: endAt
    });
    var tick = this.sinon.spy();
    timer.on('tick', tick);
    timer.start();

    // sanity
    assert.isTrue(tick.calledWith(5), '5 seconds remaining');
    tick.reset();

    this.clock.tick(999);
    assert.isFalse(tick.called, 'didnt tick');

    timer.pause();
    assert.isFalse(tick.called, 'didnt tick');

    this.clock.tick(500);
    assert.isFalse(tick.called, 'didnt tick');

    timer.start();
    assert.isTrue(tick.calledWith(5), '5 seconds remaining');

    tick.reset();
    this.clock.tick(1000);
    assert.isTrue(tick.calledWith(4), '4 seconds remaining');

    tick.reset();
    this.clock.tick(1);
    assert.isTrue(tick.calledWith(3), '3 seconds remaining');
  });

  test('cancel ', function() {
    var timer = new Timer({
      startAt: startAt,
      endAt: endAt
    });
    timer.start();

    timer.cancel();

    assert.equal(timer.state, Timer.CANCELED);
    assert.isTrue(asyncStorage.removeItem.called);
  });

  suite('notify ', function() {
    setup(function() {
      var sandbox = this.sinon;
      this.sinon.spy(navigator, 'vibrate');
      this.sinon.stub(window, 'Audio', function() {
        this.play = sandbox.spy();
        return this;
      });
    });

    suite('vibrate and sound off', function() {
      setup(function() {
        this.timer = new Timer({
          startAt: startAt,
          endAt: endAt
        });
        this.timer.notify();
      });
      test('does not call vibrate', function() {
        assert.isFalse(navigator.vibrate.called);
      });
      test('does not call Audio', function() {
        assert.isFalse(Audio.called);
      });
    });

    suite('vibrate on', function() {
      setup(function() {
        this.timer = new Timer({
          startAt: startAt,
          endAt: endAt,
          vibrate: true
        });
        this.timer.notify();
      });
      test('calls vibrate', function() {
        assert.isTrue(navigator.vibrate.called);
      });
    });
    suite('sound on', function() {
      setup(function() {
        this.timer = new Timer({
          startAt: startAt,
          endAt: endAt,
          sound: 'test'
        });
        this.timer.notify();
        this.audio = Audio.returnValues[0];
      });
      test('creates Audio', function() {
        assert.ok(this.audio instanceof Audio);
      });
      test('sets loop to false', function() {
        assert.isFalse(this.audio.loop);
      });
      test('sets mozAudioChannelType to alarm', function() {
        assert.equal(this.audio.mozAudioChannelType, 'alarm');
      });
      test('sets sound', function() {
        assert.equal(this.audio.src, 'shared/resources/media/alarms/test');
      });
      test('calls play', function() {
        assert.isTrue(this.audio.play.called);
      });
    });
  });

});
