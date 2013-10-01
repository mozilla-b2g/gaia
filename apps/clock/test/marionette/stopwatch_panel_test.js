marionette('Alarm Panel', function() {
  var assert = require('./lib/assert');
  var Stopwatch = require('./lib/stopwatch');
  var client = marionette.client();
  var stopwatch;

  setup(function() {
    stopwatch = new Stopwatch(client);
    stopwatch.launch();
  });

  test('basic operation', function(done) {
    assert.hasDuration(
      stopwatch.els.stopwatch.timeDisplay.text(),
      0,
      'Initialize with zero duration'
    );

    stopwatch.els.stopwatch.startBtn.tap();
    assert(
      !stopwatch.els.stopwatch.startBtn.displayed(),
      'Start button is not displayed while stopwatch advances'
    );

    setTimeout(function() {
      assert.hasDuration(
        stopwatch.els.stopwatch.timeDisplay.text(),
        [1000, 2000]
      );

      done();
    }, 1200);
  });

  test('lap creation', function(done) {

    assert.equal(
      stopwatch.els.stopwatch.lapS.length,
      0,
      'Stopwatch initially displays 0 laps'
    );
    stopwatch.els.stopwatch.startBtn.tap();

    stopwatch.els.stopwatch.lapBtn.tap();
    stopwatch.els.stopwatch.lapBtn.tap();

    assert.equal(
      stopwatch.els.stopwatch.lapS.length,
      2,
      'Stopwatch displays element for each lap created'
    );

    assert.hasDuration(
      stopwatch.els.stopwatch.lapS[0].text(),
      0,
      'Immediately-created lap displays 0 time'
    );

    assert.hasDuration(
      stopwatch.els.stopwatch.lapS[1].text(),
      0,
      'Immediately-created lap displays 0 time'
    );

    setTimeout(function() {
      stopwatch.els.stopwatch.lapBtn.tap();

      assert.hasDuration(
        stopwatch.els.stopwatch.lapS[0].text(),
        [1000, 2000],
        'New laps are inserted at the beginning of the lap list'
      );

      done();
    }, 1200);
  });

  test.only('resetting', function() {
    stopwatch.els.stopwatch.startBtn.tap();

    stopwatch.els.stopwatch.lapBtn.tap();
    stopwatch.els.stopwatch.lapBtn.tap();

    assert.equal(
      stopwatch.els.stopwatch.lapS.length,
      2,
      'Stopwatch displays element for each lap created'
    );

    stopwatch.els.stopwatch.pauseBtn.tap();

    stopwatch.els.stopwatch.resetBtn.tap();

    assert(
      stopwatch.els.stopwatch.resetBtn.getAttribute('disabled'),
      'Reset button is disabled after stopwatch has been reset'
    );
    assert.equal(
      stopwatch.els.stopwatch.lapS.length,
      0,
      'Laps are removed'
    );

  });

});
