
function test() {
  waitForExplicitFinish();

  function testClockStopWatch() {
    let contentWindow = shell.home.contentWindow.wrappedJSObject;
    var WindowManager = contentWindow.Gaia.WindowManager;

    setTimeout(function() {
      var clockFrame = WindowManager.launch('../clock/clock.html').element;

      waitFor(function() {
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

        finish();
      }, function() {
        let clockWindow = clockFrame.contentWindow;
        return 'StopWatch' in clockWindow && clockWindow.document.getElementById('stopwatch-action-button') != null;
      });
    }, 300);
  }

  waitFor(testClockStopWatch, function() {
    let contentWindow = shell.home.contentWindow.wrappedJSObject;
    return 'Gaia' in contentWindow && 'WindowManager' in contentWindow.Gaia;
  });
}
