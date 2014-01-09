suite('Timer', function() {
  var Timer;
  var now, duration;

  suiteSetup(function(done) {
    loadBodyHTML('/index.html');

    testRequire(['timer'], function(timer) {
      Timer = timer;
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
