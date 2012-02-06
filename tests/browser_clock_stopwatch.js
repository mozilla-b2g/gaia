
function test() {
  waitForExplicitFinish();

  let url = '../clock/clock.html';

  getWindowManager(function(windowManager) {
    function onReady(clockFrame) {
      var document = clockFrame.contentWindow.document;
      var actionButton = document.getElementById('stopwatch-action-button');
      var stopWatch = clockFrame.contentWindow.StopWatch;
      var tickerView = document.getElementById('stopwatch-ticker-view');

      // start the stopwatch
      EventUtils.sendMouseEvent({type: 'click'}, actionButton);

      ok(actionButton.dataset.action == 'stop', 'Stop button present');
      ok(tickerView.classList.contains('running'), 'Animation running');
      isnot(stopWatch._startTime, undefined, 'Start time set');
      isnot(stopWatch._ticker, undefined, 'Ticker running');

      // stop the stopwatch
      EventUtils.sendMouseEvent({type: 'click'}, actionButton);

      ok(actionButton.dataset.action == 'start', 'Start button present');
      ok(!tickerView.classList.contains('running'), 'Animation stoped');
      isnot(stopWatch._elasped, 0, 'Elapsed time kept');
      is(stopWatch._ticker, undefined, 'Ticker cleared');
      is(stopWatch._startTime, undefined, 'Start time deleted');

      // reset the stopwatch
      EventUtils.sendMouseEvent({type: 'click'},
                                document.getElementById('reset-button'));
      is(stopWatch._elapsed, 0, 'Elapsed time reset');

      windowManager.closeForegroundWindow();
    }

    function onClose() {
      windowManager.kill(url);
      finish();
    }

    let appFrame = windowManager.launch(url).element;
    ApplicationObserver(appFrame, onReady, onClose);
  });
}
