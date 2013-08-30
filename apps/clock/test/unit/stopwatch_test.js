requireApp('clock/js/stopwatch.js');
requireApp('clock/js/utils.js');

suite('Stopwatch', function() {

  var oneHour = 1 * 60 * 60 * 1000;

  suiteSetup(function() {
    this.sw = new Stopwatch();
  });

  setup(function() {
    this.clock = this.sinon.useFakeTimers();
  });

  teardown(function() {
    this.clock.restore();
    this.sw.reset();
  });

  suite('getElapsedTime', function() {

    test('before start', function() {
      assert.equal(this.sw.getElapsedTime().getTime(), 0);
    });

    test('after start', function() {
      this.sw.start();
      this.clock.tick(oneHour);
      assert.equal(this.sw.getElapsedTime().getTime(), oneHour);
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
      assert.equal(this.sw.getElapsedTime().getTime(), oneHour);
    });

    test('pause & elapse 1 hr & resume', function() {
      this.sw.pause();
      this.clock.tick(oneHour); // do not elapse this hour
      this.sw.start();
      this.clock.tick(oneHour);
      assert.equal(this.sw.getElapsedTime().getTime(), oneHour + oneHour);
    });

  });

  suite('lap', function() {

    test('lap before start', function() {
      var l = this.sw.lap();
      assert.equal(l.getTime(), 0);
    });

    test('elapse 1hr & lap', function() {
      this.sw.start();
      this.clock.tick(oneHour);
      var l = this.sw.lap();
      assert.equal(l.getTime(), oneHour);
    });

    test('lap 3 times', function() {
      this.sw.start();
      this.clock.tick(oneHour);
      var l1 = this.sw.lap();
      this.clock.tick(oneHour);
      var l2 = this.sw.lap();
      this.clock.tick(oneHour);
      var l3 = this.sw.lap();
      assert.equal(l1.getTime(), oneHour);
      assert.equal(l2.getTime(), oneHour);
      assert.equal(l3.getTime(), oneHour);
    });

  });

  suite('reset', function() {

    setup(function() {
      this.sw.start();
      this.clock.tick(oneHour);
    });

    test('elapse 1hr & reset', function() {
      this.sw.reset();
      assert.equal(this.sw.getElapsedTime().getTime(), 0);
    });

  });

});
