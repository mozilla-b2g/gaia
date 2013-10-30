suite('Stopwatch', function() {

  var Stopwatch;
  var oneHour = 1 * 60 * 60 * 1000;

  suiteSetup(function(done) {
    testRequire(['stopwatch'], function(stopwatch) {
      Stopwatch = stopwatch;
      this.sw = new Stopwatch();
      done();
    }.bind(this));
  });

  setup(function() {
    this.clock = this.sinon.useFakeTimers();
  });

  teardown(function() {
    this.clock.restore();
    this.sw.reset();
  });

  suite('constructor', function() {

    test('defaults', function() {
      assert.isTrue(this.sw.getState() === Stopwatch.RESET);
      assert.equal(this.sw.getElapsedTime(), 0);
      assert.deepEqual(this.sw.getLaps(), []);
    });

    test('from object', function() {
      var input = {
        startTime: Date.now(),
        totalElapsed: oneHour,
        state: Stopwatch.RUNNING,
        laps: [{time: Date.now(), duration: oneHour}]
      };
      this.sw = new Stopwatch(input);
      assert.deepEqual(input, this.sw.toSerializable());
    });

    test('deep copy', function() {
      var input = {
        startTime: Date.now(),
        totalElapsed: oneHour,
        isStarted: true,
        laps: [{time: Date.now(), duration: oneHour}]
      };
      this.sw = new Stopwatch(input);
      var serialized = this.sw.toSerializable();
      serialized.laps.push({ time: 0, duration: oneHour });
      assert.notEqual(serialized.laps, input.laps, 'laps should not be equal');
    });

  });

  suite('isRunning', function() {

    test('before start', function() {
      assert.isFalse(this.sw.getState() === Stopwatch.RUNNING);
      assert.isFalse(this.sw.getState() === Stopwatch.PAUSED);
      assert.isTrue(this.sw.getState() === Stopwatch.RESET);
    });

    test('start and elapse 1hr', function() {
      this.sw.start();
      this.clock.tick(oneHour);
      assert.isTrue(this.sw.getState() === Stopwatch.RUNNING);
    });

    test('elapse 1hr and pause', function() {
      this.sw.start();
      this.clock.tick(oneHour);
      this.sw.pause();
      assert.isTrue(this.sw.getState() === Stopwatch.PAUSED);
    });

    test('pause and resume', function() {
      this.sw.start();
      this.clock.tick(oneHour);
      this.sw.pause();
      this.clock.tick(oneHour);
      this.sw.start();
      assert.isTrue(this.sw.getState() === Stopwatch.RUNNING);
    });

    test('pause and reset', function() {
      this.sw.start();
      this.clock.tick(oneHour);
      this.sw.pause();
      this.clock.tick(oneHour);
      this.sw.reset();
      assert.isTrue(this.sw.getState() === Stopwatch.RESET);
    });

  });

  suite('getElapsedTime', function() {

    test('before start', function() {
      assert.equal(this.sw.getElapsedTime(), 0);
    });

    test('after start', function() {
      this.sw.start();
      this.clock.tick(oneHour);
      assert.equal(this.sw.getElapsedTime(), oneHour);
    });

  });

  suite('pause', function() {

    setup(function() {
      this.sw.start();
      this.clock.tick(oneHour);
    });

    test('elapse 1hr & pause', function() {
      this.sw.pause();
      this.clock.tick(oneHour); // do not elapse this hour
      assert.equal(this.sw.getElapsedTime(), oneHour);
    });

    test('pause & elapse 1 hr & resume', function() {
      this.sw.pause();
      this.clock.tick(oneHour); // do not elapse this hour
      this.sw.start();
      this.clock.tick(oneHour);
      assert.equal(this.sw.getElapsedTime(), oneHour + oneHour);
    });

  });

  suite('lap', function() {

    test('before start', function() {
      var l = this.sw.lap();
      assert.equal(l, 0);
    });

    test('elapse 1hr & lap', function() {
      this.sw.start();
      this.clock.tick(oneHour);
      var l = this.sw.lap();
      assert.deepEqual(l, { duration: oneHour, time: oneHour });
    });

    test('3 times', function() {
      this.sw.start();
      this.clock.tick(oneHour);
      var l1 = this.sw.lap();
      this.clock.tick(oneHour);
      var l2 = this.sw.lap();
      this.clock.tick(oneHour);
      var l3 = this.sw.lap();
      assert.deepEqual(l1, { duration: oneHour, time: oneHour });
      assert.deepEqual(l2, { duration: oneHour, time: 2 * oneHour });
      assert.deepEqual(l3, { duration: oneHour, time: 3 * oneHour });
    });

    test('lap & pause & start & lap', function() {
      this.sw.start();
      this.clock.tick(oneHour);
      var l1 = this.sw.lap();
      this.sw.pause();
      this.clock.tick(oneHour);
      this.sw.start();
      this.clock.tick(oneHour);
      var l2 = this.sw.lap();
      assert.deepEqual(l1, { duration: oneHour, time: oneHour });
      assert.deepEqual(l2, { duration: oneHour, time: 2 * oneHour });
    });

  });

  suite('getLaps', function() {

    setup(function() {
      this.sw.start();
      this.clock.tick(oneHour);
    });

    test('after 3 laps', function() {
      this.sw.lap();
      this.clock.tick(oneHour);
      this.sw.lap();
      this.clock.tick(oneHour + oneHour);
      this.sw.lap();
      assert.equal(this.sw.getLaps()[0].duration, oneHour);
      assert.equal(this.sw.getLaps()[1].duration, oneHour);
      assert.equal(this.sw.getLaps()[2].duration, oneHour + oneHour);
    });

  });

  suite('reset', function() {

    setup(function() {
      this.sw.start();
      this.clock.tick(oneHour);
    });

    test('elapse 1hr & reset', function() {
      this.sw.reset();
      assert.equal(this.sw.getElapsedTime(), 0);
    });

  });

  suite('toSerializable', function() {

    test('default', function() {
      var expected = {
        startTime: 0,
        totalElapsed: 0,
        state: Stopwatch.RESET,
        laps: []
      };
      var actual = this.sw.toSerializable();
      assert.deepEqual(expected, actual);
    });

    suite('started', function() {

      var d;

      setup(function() {
        d = Date.now();
        this.sw.start();
        this.clock.tick(oneHour);
      });

      test('deep copy', function() {
        this.sw.pause();
        var serialized = this.sw.toSerializable();
        serialized.laps.push({ duration: 23, time: 0 });
        assert.deepEqual(this.sw.getLaps(), []);
      });

      test('elapse 1hr', function() {
        var expected = {
          startTime: d,
          totalElapsed: 0,
          state: Stopwatch.RUNNING,
          laps: []
        };
        var actual = this.sw.toSerializable();
        assert.deepEqual(expected, actual);
      });

      test('elapse 1hr and pause', function() {
        this.sw.pause();
        var expected = {
          startTime: d,
          totalElapsed: oneHour,
          state: Stopwatch.PAUSED,
          laps: []
        };
        var actual = this.sw.toSerializable();
        assert.deepEqual(expected, actual);
      });

      test('elapse 1hr and lap', function() {
        this.sw.lap();
        var expected = {
          startTime: d,
          totalElapsed: 0,
          state: Stopwatch.RUNNING,
          laps: [{time: Date.now(), duration: oneHour}]
        };
        var actual = this.sw.toSerializable();
        assert.deepEqual(expected, actual);
      });

      test('pause and reset', function() {
        this.sw.pause();
        this.clock.tick(oneHour);
        this.sw.reset();
        var expected = {
          startTime: 0,
          totalElapsed: 0,
          state: Stopwatch.RESET,
          laps: []
        };
        var actual = this.sw.toSerializable();
        assert.deepEqual(expected, actual);
      });

      test('pause and resume', function() {
        this.sw.pause();
        this.clock.tick(oneHour);
        this.sw.start();
        var expected = {
          startTime: oneHour,
          totalElapsed: oneHour,
          state: Stopwatch.RUNNING,
          laps: []
        };
        var actual = this.sw.toSerializable();
        assert.deepEqual(expected, actual);
      });

    });

  });

});
