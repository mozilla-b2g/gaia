suite('Stopwatch.Panel', function() {

  var defaultSw, sevenMinSw, fourSecPausedSw, withLapsSw, runningSw;
  var isHidden;
  var panel;
  var clock;
  var Stopwatch;
  var MockL10n, localize;

  suiteSetup(function(done) {
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

    loadBodyHTML('/index.html');


    testRequire([
      'stopwatch', 'stopwatch_panel', 'mocks/mock_shared/js/l10n'
      ], function(stopwatch, stopwatchPanel, mockL10n) {
        Stopwatch = stopwatch;
        Stopwatch.Panel = stopwatchPanel;
        MockL10n = mockL10n;
        panel = new Stopwatch.Panel(
          document.getElementById('stopwatch-panel')
        );
        done();
      }
    );
  });

  setup(function() {
    clock = this.sinon.useFakeTimers();
    localize = this.sinon.spy(MockL10n, 'localize');
  });

  test('Default', function() {
    assert.equal(panel.nodes.time.textContent, '00:00.00');
    assert.isFalse(isHidden(panel.nodes.start));
    assert.isFalse(isHidden(panel.nodes.reset));

    assert.isTrue(isHidden(panel.nodes.pause));
    assert.isTrue(isHidden(panel.nodes.lap));
    assert.isTrue(isHidden(panel.nodes.resume));
  });

  test('Seven Minute Running', function() {
    var x = sevenMinSw();
    panel.setStopwatch(x);

    assert.equal(panel.nodes.time.textContent, '07:00.17');
    assert.isFalse(isHidden(panel.nodes.pause));
    assert.isFalse(isHidden(panel.nodes.lap));

    assert.isTrue(isHidden(panel.nodes.start));
    assert.isTrue(isHidden(panel.nodes.reset));
    assert.isTrue(isHidden(panel.nodes.resume));

    clock.tick(3000);
    panel.update(); // required due to requestAnimationFrame not being called
    assert.equal(panel.nodes.time.textContent, '07:03.17');
  });

  test('Pause a stopwatch', function() {
    panel.setStopwatch(sevenMinSw());
    panel.nodes.pause.click();

    clock.tick(3000);
    panel.update(); // required due to requestAnimationFrame not being called
    assert.equal(panel.nodes.time.textContent, '07:00.17');
  });

  test('Four Second Paused', function() {
    panel.setStopwatch(fourSecPausedSw());
    panel.update(); // required due to requestAnimationFrame not being called

    assert.equal(panel.nodes.time.textContent, '00:04.23');
    assert.isFalse(isHidden(panel.nodes.resume));
    assert.isFalse(isHidden(panel.nodes.reset));

    assert.isTrue(isHidden(panel.nodes.pause));
    assert.isTrue(isHidden(panel.nodes.start));
    assert.isTrue(isHidden(panel.nodes.lap));

    clock.tick(3000);
    panel.update(); // required due to requestAnimationFrame not being called
    assert.equal(panel.nodes.time.textContent, '00:04.23');
  });

  test('Resume a stopwatch', function() {
    panel.setStopwatch(fourSecPausedSw());
    panel.nodes.resume.click();

    clock.tick(3000);
    panel.update(); // required due to requestAnimationFrame not being called
    assert.equal(panel.nodes.time.textContent, '00:07.23');
  });

  test('Pre-existing laps', function() {
    var tmp = withLapsSw();
    panel.setStopwatch(tmp); //withLapsSw());
    var laps = panel.nodes['laps'].querySelectorAll('li');
    assert.equal(laps.length, 3);
    var lapTime;

    lapTime = laps[0].children[1].textContent.trim();
    assert.equal(lapTime, '39:09.12');

    lapTime = laps[1].children[1].textContent.trim();
    assert.equal(lapTime, '00:04.23');

    lapTime = laps[2].children[1].textContent.trim();
    assert.equal(lapTime, '03:00.13');
  });

  test('Add laps', function() {

    function getLapInfo() {
      var laps = panel.nodes.laps.querySelectorAll('li');
      laps = Array.prototype.slice.call(laps);
      return laps.map(function(e) {
        return {
          lapName: e.children[0],
          lapTime: e.children[1].textContent.trim()
        };
      });
    };

    panel.setStopwatch(runningSw());
    assert.equal(panel.nodes.time.textContent, '00:00.00');

    //Advance and click the lap button
    clock.tick(3000);
    panel.update(); // required due to requestAnimationFrame not being called
    assert.equal(panel.nodes.time.textContent, '00:03.00');

    panel.nodes.lap.click();
    var laps = getLapInfo();
    assert.equal(laps.length, 2);

    assert.equal(laps[1].lapTime, '00:03.00');

    //Advance and add another lap
    clock.tick(9000);
    panel.update(); // required due to requestAnimationFrame not being called
    assert.equal(panel.nodes.time.textContent, '00:12.00');

    panel.nodes.lap.click();

    laps = getLapInfo();
    assert.equal(laps.length, 3);

    assert.equal(laps[1].lapTime, '00:09.00');

  });

  test('Reset stopwatch', function() {
    var laps;

    panel.setStopwatch(runningSw());
    assert.equal(panel.nodes.time.textContent, '00:00.00');

    //Advance and click the lap button (twice)
    clock.tick(3000);
    panel.update(); // required due to requestAnimationFrame not being called
    panel.nodes.lap.click();
    clock.tick(9000);
    panel.update(); // required due to requestAnimationFrame not being called
    panel.nodes.lap.click();

    laps = panel.nodes['laps'].querySelectorAll('li');
    assert.equal(laps.length, 3);

    //Reset
    panel.nodes.pause.click();
    panel.nodes.reset.click();
    laps = panel.nodes['laps'].querySelectorAll('li');
    assert.equal(laps.length, 0);
    assert.equal(panel.nodes.time.textContent, '00:00.00');

  });

});
