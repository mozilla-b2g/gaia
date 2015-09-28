'use strict';
/* global MockL10n, MockMozIntl, MockIntlHelper */
suite('Stopwatch.Panel', function() {

  var sevenMinSw, fourSecPausedSw, withLapsSw, runningSw;
  var isHidden;
  var panel;
  var clock;
  var Stopwatch;

  suiteSetup(function(done) {
    navigator.mozL10n = MockL10n;
    window.mozIntl = MockMozIntl;
    window.IntlHelper = MockIntlHelper;
    var threeMin = 3 * 60 * 1000 + 130;
    var sevenMin = 7 * 60 * 1000 + 170;
    var fourSec = 4 * 1000 + 230;
    var thirtyMins = 30 * 60 * 1000 + 270;

    runningSw = function() {
      return new Stopwatch({
        startTime: Date.now(),
        totalElapsed: 0,
        state: Stopwatch.RUNNING,
        laps: []
      });
    };

    sevenMinSw = function() {
      return new Stopwatch({
        startTime: Date.now() - sevenMin,
        totalElapsed: 0,
        state: Stopwatch.RUNNING,
        laps: []
      });
    };

    fourSecPausedSw = function() {
      return new Stopwatch({
        startTime: Date.now(),
        totalElapsed: fourSec,
        state: Stopwatch.PAUSED,
        laps: []
      });
    };

    withLapsSw = function() {
      var sw = new Stopwatch();
      sw.start();
      clock.tick(threeMin);
      panel.update();
      sw.lap();
      clock.tick(fourSec);
      panel.update();
      sw.lap();
      clock.tick(thirtyMins + threeMin * 3 + fourSec * 2);
      panel.update();
      return sw;
    };

    isHidden = function(element) {
      return element.className.contains('hidden');
    };

    require([
      'stopwatch', 'panels/stopwatch/main'
      ], function(stopwatch, stopwatchPanel) {
        Stopwatch = stopwatch;
        Stopwatch.Panel = stopwatchPanel;
        panel = new Stopwatch.Panel(
          document.createElement('div')
        );
        done();
      }
    );
  });

  setup(function() {
    clock = this.sinon.useFakeTimers();
  });

  test('Default', function() {
    assert.isFalse(isHidden(panel.nodes.start));
    assert.isFalse(isHidden(panel.nodes.reset));

    assert.isTrue(isHidden(panel.nodes.pause));
    assert.isTrue(isHidden(panel.nodes.lap));
    assert.isTrue(isHidden(panel.nodes.resume));
  });

  test('Seven Minute Running', function(done) {
    var x = sevenMinSw();
    panel.setStopwatch(x).then(() => {
      assert.equal(panel.nodes.time.textContent, JSON.stringify({
        value: 420170,
        options: {
          type: 'msS'
        }
      }));
      assert.isFalse(isHidden(panel.nodes.pause));
      assert.isFalse(isHidden(panel.nodes.lap));

      assert.isTrue(isHidden(panel.nodes.start));
      assert.isTrue(isHidden(panel.nodes.reset));
      assert.isTrue(isHidden(panel.nodes.resume));
    }).then(() => {
      clock.tick(3000);
      // required due to requestAnimationFrame not being called
      return panel.update();
    }).then(() => {
      assert.equal(panel.nodes.time.textContent, JSON.stringify({
        value: 420170 + 3000,
        options: {
          type: 'msS'
        }
      }));
    }).then(done, done);

  });

  test('Pause a stopwatch', function(done) {
    panel.setStopwatch(sevenMinSw());
    panel.nodes.pause.click();

    clock.tick(3000);
    // required due to requestAnimationFrame not being called
    panel.update().then(() => {
      assert.equal(panel.nodes.time.textContent, JSON.stringify({
        value: 420170,
        options: {
          type: 'msS'
        }
      }));
    }).then(done, done);
  });

  test('Four Second Paused', function(done) {
    panel.setStopwatch(fourSecPausedSw());
    // required due to requestAnimationFrame not being called
    panel.update().then(() => {
      assert.equal(panel.nodes.time.textContent, JSON.stringify({
        value: 4230,
        options: {
          type: 'msS'
        }
      }));
      assert.isFalse(isHidden(panel.nodes.resume));
      assert.isFalse(isHidden(panel.nodes.reset));

      assert.isTrue(isHidden(panel.nodes.pause));
      assert.isTrue(isHidden(panel.nodes.start));
      assert.isTrue(isHidden(panel.nodes.lap));
      clock.tick(3000);
      // required due to requestAnimationFrame not being called
      return panel.update();
    }).then(() => {
      assert.equal(panel.nodes.time.textContent, JSON.stringify({
        value: 4230,
        options: {
          type: 'msS'
        }
      }));
    }).then(done, done);
  });

  test('Resume a stopwatch', function(done) {
    panel.setStopwatch(fourSecPausedSw());
    panel.nodes.resume.click();

    clock.tick(3000);
    // required due to requestAnimationFrame not being called
    panel.update().then(() => {
      assert.equal(panel.nodes.time.textContent, JSON.stringify({
        value: 7230,
        options: {
          type: 'msS'
        }
      }));
    }).then(done, done);
  });

  test('Pre-existing laps', function(done) {
    var tmp = withLapsSw();
    panel.setStopwatch(tmp).then(() => {
      var laps = panel.nodes.laps.querySelectorAll('li');
      assert.equal(laps.length, 3);

      assert.equal(laps[0].children[1].textContent, JSON.stringify({
        value: 2349120,
        options: {
          type: 'msS'
        }
      }));

      assert.equal(laps[1].children[1].textContent, JSON.stringify({
        value: 4230,
        options: {
          type: 'msS'
        }
      }));

      assert.equal(laps[2].children[1].textContent, JSON.stringify({
        value: 180130,
        options: {
          type: 'msS'
        }
      }));
    }).then(done, done);
  });

  test('Add laps', function(done) {

    function getLapInfo() {
      var laps = panel.nodes.laps.querySelectorAll('li');
      laps = Array.prototype.slice.call(laps);
      return laps.map(function(e) {
        return {
          lapName: e.children[0],
          lapTime: e.children[1].textContent.trim()
        };
      });
    }

    panel.setStopwatch(runningSw()).then(() => {
      assert.equal(panel.nodes.time.textContent, JSON.stringify({
        value: 0,
        options: {
          type: 'msS'
        }
      }));
    }).then(() => {
      //Advance and click the lap button
      clock.tick(3000);
      // required due to requestAnimationFrame not being called
      return panel.update();
    }).then(() => {
      assert.equal(panel.nodes.time.textContent, JSON.stringify({
        value: 3000,
        options: {
          type: 'msS'
        }
      }));
      panel.nodes.lap.click();
    }).then(() => {
      var laps = getLapInfo();
      assert.equal(laps.length, 2);

      assert.equal(laps[1].lapTime, JSON.stringify({
        value: 3000,
        options: {
          type: 'msS'
        }
      }));

      //Advance and add another lap
      clock.tick(9000);
      // required due to requestAnimationFrame not being called
      return panel.update();
    }).then(() => {
      assert.equal(panel.nodes.time.textContent, JSON.stringify({
        value: 9000 + 3000,
        options: {
          type: 'msS'
        }
      }));

      panel.nodes.lap.click();
    }).then(() => {
      var laps = getLapInfo();
      assert.equal(laps.length, 3);

      assert.equal(laps[1].lapTime, JSON.stringify({
        value: 9000,
        options: {
          type: 'msS'
        }
      }));
    }).then(done, done);
  });

  test('Reset stopwatch', function(done) {
    var laps;

    panel.setStopwatch(runningSw()).then(() => {
      assert.equal(panel.nodes.time.textContent, JSON.stringify({
        value: 0,
        options: {
          type: 'msS'
        }
      }));
      //Advance and click the lap button (twice)
      clock.tick(3000);
      // required due to requestAnimationFrame not being called
      panel.update();
      panel.nodes.lap.click();
      clock.tick(9000);
      // required due to requestAnimationFrame not being called
      panel.update();
      panel.nodes.lap.click();
    }).then(() => {
      laps = panel.nodes.laps.querySelectorAll('li');
      assert.equal(laps.length, 3);

      //Reset
      panel.nodes.pause.click();
      panel.nodes.reset.click();
    }).then(() => {
      laps = panel.nodes.laps.querySelectorAll('li');
      assert.equal(laps.length, 0);
      assert.equal(panel.nodes.time.textContent, JSON.stringify({
        value: 0,
        options: {
          type: 'msS'
        }
      }));
    }).then(done, done);
  });

  test('Stopwatch 100 minutes display', function(done) {
    panel.setStopwatch(runningSw());

    assert.ok(!panel.nodes.time.classList.contains('over-100-minutes'));

    clock.tick(1000 * 60 * 105); // over 100 minutes
    // required due to requestAnimationFrame not being called
    panel.update().then(() => {
      assert.ok(panel.nodes.time.classList.contains('over-100-minutes'));
    }).then(done, done);
  });

});
