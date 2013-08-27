requireApp('clock/js/stopwatch.js');
requireApp('clock/js/utils.js');

requireApp('clock/test/unit/mocks/mock_navigator_mozl10n.js');

// http://www.reddit.com/r/mildlyinteresting/comments/1l4224/i_started_the_stopwatch_when_i_got_my_iphone_3/

suite('Stopwatch', function() {
  var nml;
  var sw;

  suiteSetup(function() {
    nml = navigator.mozL10n;
    navigator.mozL10n = MockmozL10n;

    loadBodyHTML('/index.html');

    // The timestamp for "Tue Jul 16 2013 06:00:00" according to the local
    // system's time zone
    this.sixAm = 1373954400000 + (new Date()).getTimezoneOffset() * 60 * 1000;
    this.oneHour = 1 * 60 * 60 * 1000;
  });

  suiteTeardown(function() {
    navigator.mozL10n = nml;
  });

  setup(function() {
    sw = new Stopwatch();
    this.clock = this.sinon.useFakeTimers(this.sixAm);
  });

  teardown(function() {
    this.clock.restore();
  });

  test('start', function() {
    sw.start();
    assert.equal(sw.startTime, this.sixAm);
  });

  test('start & elapse 1 hr', function() {
    sw.start();
    this.clock.tick(this.oneHour);
    assert.equal(sw.getElapsedTime(), this.oneHour);
  });

  test('start & elapse 1 hr & pause', function() {
    sw.start();
    this.clock.tick(this.oneHour);
    sw.pause();
    this.clock.tick(this.oneHour); // do not elapse this hour
    assert.equal(sw.getElapsedTime(), this.oneHour);
  });

  test('start & elapse 1hr & lap', function() {
    sw.start();
    this.clock.tick(this.oneHour);
    var l = sw.lap();
    assert.equal(l, this.oneHour);
  });

  test('start & lap multiple times', function() {
    sw.start();
    this.clock.tick(this.oneHour);
    var l1 = sw.lap();
    this.clock.tick(this.oneHour);
    var l2 = sw.lap();
    this.clock.tick(this.oneHour);
    var l3 = sw.lap();
    console.log(sw.lapTimes);
    assert.equal(l1, this.oneHour);
    assert.equal(l2, this.oneHour);
    assert.equal(l3, this.oneHour);
  });

  test('pause & elapse 1 hr & resume', function() {
    sw.start();
    this.clock.tick(this.oneHour);
    sw.pause();
    this.clock.tick(this.oneHour); // do not elapse this hour
    sw.start();
    this.clock.tick(this.oneHour);
    assert.equal(sw.getElapsedTime(), this.oneHour + this.oneHour);
  });

  test('pause & elapse 1hr & reset', function() {
    sw.start();
    this.clock.tick(this.oneHour);
    sw.pause();
    this.clock.tick(this.oneHour);
    sw.reset();
    this.clock.tick(this.oneHour);
    assert.equal(sw.getElapsedTime(), 0);
  });
});
