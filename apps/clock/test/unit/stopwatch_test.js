requireApp('clock/js/stopwatch.js');
requireApp('clock/js/utils.js');

suite('Stopwatch', function() {

  // The timestamp for "Tue Jul 16 2013 06:00:00" according to the local
  // system's time zone
  var sixAm = 1373954400000 + (new Date()).getTimezoneOffset() * 60 * 1000;
  var oneHour = 1 * 60 * 60 * 1000;

  suiteSetup(function() {
    this.sw = new Stopwatch();
  });

  setup(function() {
    this.clock = this.sinon.useFakeTimers(sixAm);
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

    setup(function() {
      this.sw.start();
      this.clock.tick(oneHour);
    });

    test('elapse 1hr & lap', function() {
      var l = this.sw.lap();
      assert.equal(l.getTime(), oneHour);
    });

    test('lap multiple times', function() {
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
