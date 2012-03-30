function generatorTest() {
  waitForExplicitFinish();
  yield testApp('http://clock.gaiamobile.org/', testStopwatch);
  finish();
}

function testStopwatch(window, document, nextStep) {
  var stopWatch = window.StopWatch;
  var actionButton = document.getElementById('stopwatch-action-button');
  var tickerView = document.getElementById('stopwatch-ticker-view');

  // start the stopwatch
  EventUtils.sendMouseEvent({type: 'click'}, actionButton);
  yield setTimeout(nextStep, 100);

  ok(actionButton.dataset.action == 'stop', 'Stop button present');
  ok(tickerView.classList.contains('running'), 'Animation running');
  isnot(stopWatch._startTime, undefined, 'Start time set');
  isnot(stopWatch._ticker, undefined, 'Ticker running');

  // stop the stopwatch
  EventUtils.sendMouseEvent({type: 'click'}, actionButton);
  yield setTimeout(nextStep, 100);

  ok(actionButton.dataset.action == 'start', 'Start button present');
  ok(!tickerView.classList.contains('running'), 'Animation stoped');
  isnot(stopWatch._elasped, 0, 'Elapsed time kept');
  is(stopWatch._ticker, undefined, 'Ticker cleared');
  is(stopWatch._startTime, undefined, 'Start time deleted');

  // reset the stopwatch
  EventUtils.sendMouseEvent({type: 'click'},
                            document.getElementById('reset-button'));
  yield setTimeout(nextStep, 100);
  is(stopWatch._elapsed, 0, 'Elapsed time reset');
}
