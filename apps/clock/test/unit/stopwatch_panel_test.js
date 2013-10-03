requireApp('clock/js/emitter.js');
requireApp('clock/js/view.js');
requireApp('clock/js/panel.js');
requireApp('clock/js/utils.js');

requireApp('clock/test/unit/mocks/mock_navigator_mozl10n.js');
requireApp('clock/js/stopwatch.js');
requireApp('clock/js/stopwatch_panel.js');

suite('Stopwatch.Panel', function() {

  var defaultSw, sevenMinSw, fourSecPausedSw, withLapsSw, runningSw;
  var isHidden;
  var panel;
  var clock;
  var nativeMozL10n;
  var localize;

  suiteSetup(function() {
    var sevenMin = 7 * 60 * 1000;
    var fourSec = 4 * 1000;
    var thirtyMins = 30 * 60 * 1000;

    nativeMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

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
        startTime: Date.now(),
        totalElapsed: sevenMin,
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
      return new Stopwatch({
        startTime: Date.now(),
        totalElapsed: sevenMin,
        state: Stopwatch.RUNNING,
        laps: [{time: Date.now(), duration: thirtyMins}]
      });
    };

    isHidden = function(element) {
      return element.className.contains('hidden');
    };

    loadBodyHTML('/index.html');

    panel = new Stopwatch.Panel(document.getElementById('stopwatch-panel'));
  });

  suiteTeardown(function() {
    navigator.mozL10n = nativeMozL10n;
  });

  setup(function() {
    clock = this.sinon.useFakeTimers();
    localize = this.sinon.spy(navigator.mozL10n, 'localize');
  });

  test('Default', function() {
    assert.equal(panel.nodes.time.textContent, '00:00');
    assert.isFalse(isHidden(panel.nodes.start));
    assert.isFalse(isHidden(panel.nodes.reset));

    assert.isTrue(isHidden(panel.nodes.pause));
    assert.isTrue(isHidden(panel.nodes.lap));
    assert.isTrue(isHidden(panel.nodes.resume));
  });

  test('Seven Minute Running', function() {
    panel.setStopwatch(sevenMinSw());

    assert.equal(panel.nodes.time.textContent, '07:00');
    assert.isFalse(isHidden(panel.nodes.pause));
    assert.isFalse(isHidden(panel.nodes.lap));

    assert.isTrue(isHidden(panel.nodes.start));
    assert.isTrue(isHidden(panel.nodes.reset));
    assert.isTrue(isHidden(panel.nodes.resume));

    clock.tick(3000);
    assert.equal(panel.nodes.time.textContent, '07:03');
  });

  test('Pause a stopwatch', function() {
    panel.setStopwatch(sevenMinSw());
    panel.nodes.pause.click();

    clock.tick(3000);
    assert.equal(panel.nodes.time.textContent, '07:00');
  });

  test('Four Second Paused', function() {
    panel.setStopwatch(fourSecPausedSw());

    assert.equal(panel.nodes.time.textContent, '00:04');
    assert.isFalse(isHidden(panel.nodes.resume));
    assert.isFalse(isHidden(panel.nodes.reset));

    assert.isTrue(isHidden(panel.nodes.pause));
    assert.isTrue(isHidden(panel.nodes.start));
    assert.isTrue(isHidden(panel.nodes.lap));

    clock.tick(3000);
    assert.equal(panel.nodes.time.textContent, '00:04');
  });

  test('Resume a stopwatch', function() {
    panel.setStopwatch(fourSecPausedSw());
    panel.nodes.resume.click();

    clock.tick(3000);
    assert.equal(panel.nodes.time.textContent, '00:07');
  });

  test('Pre-existing laps', function() {
    panel.setStopwatch(withLapsSw());

    var laps = panel.nodes['laps'].querySelectorAll('li');
    assert.equal(laps.length, 1);

    var lapName = laps[0].children[0];
    var lapTime = laps[0].children[1].textContent.trim();

    assert.deepEqual(localize.args[0], [
      lapName, 'lap-number', {n: 1}
    ]);
    assert.equal(lapTime, '30:00');

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
    assert.equal(panel.nodes.time.textContent, '00:00');

    //Advance and click the lap button
    clock.tick(3000);
    assert.equal(panel.nodes.time.textContent, '00:03');

    panel.nodes.lap.click();
    var laps = getLapInfo();
    assert.equal(laps.length, 1);

    assert.deepEqual(localize.args[0], [
      laps[0].lapName, 'lap-number', {n: 1}
    ]);
    assert.equal(laps[0].lapTime, '00:03');

    //Advance and add another lap
    clock.tick(9000);
    assert.equal(panel.nodes.time.textContent, '00:12');

    panel.nodes.lap.click();

    laps = getLapInfo();
    assert.equal(laps.length, 2);

    assert.deepEqual(localize.args[1], [
      laps[0].lapName, 'lap-number', {n: 2}
    ]);
    assert.equal(laps[0].lapTime, '00:09');

  });

  test('Reset stopwatch', function() {
    var laps;

    panel.setStopwatch(runningSw());
    assert.equal(panel.nodes.time.textContent, '00:00');

    //Advance and click the lap button (twice)
    clock.tick(3000);
    panel.nodes.lap.click();
    clock.tick(9000);
    panel.nodes.lap.click();

    laps = panel.nodes['laps'].querySelectorAll('li');
    assert.equal(laps.length, 2);

    //Reset
    panel.nodes.pause.click();
    panel.nodes.reset.click();
    laps = panel.nodes['laps'].querySelectorAll('li');
    assert.equal(laps.length, 0);
    assert.equal(panel.nodes.time.textContent, '00:00');

  });

  test('Lap locationlization', function() {
    var laps, lapName1, lapName2;

    panel.nodes.start.click();
    panel.nodes.lap.click();
    panel.nodes.lap.click();

    assert.ok(localize.calledTwice);
    laps = panel.nodes.laps.querySelectorAll('li');
    lapName1 = laps[1].children[0];
    lapName2 = laps[0].children[0];
    assert.deepEqual(localize.args[0], [
      lapName1, 'lap-number', {n: 1}
    ]);
    assert.deepEqual(localize.args[1], [
      lapName2, 'lap-number', {n: 2}
    ]);
  });

});
