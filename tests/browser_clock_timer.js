
function test() {
  waitForExplicitFinish();

  function testClockTimer() {
    let contentWindow = shell.home.contentWindow.wrappedJSObject;
    var AppManager = contentWindow.Gaia.AppManager;

    setTimeout(function() {
      var clockFrame = AppManager.launch('../clock/clock.html');

      waitFor(function() {
        var document = clockFrame.contentWindow.document;
        var startCancelButton = document.getElementById('timer-action-button');
        var timer = clockFrame.contentWindow.Timer;

        // starting the timer
        EventUtils.sendMouseEvent({type: 'click'}, startCancelButton);

        ok(startCancelButton.dataset.action == 'cancel', 'Cancel button present');
        ok(document.getElementById('timer-ticker-view').classList.contains('running'), 'Timer animation running');
        isnot(timer._endTime, undefined, 'End time set');
        isnot(timer._ticker, undefined, 'Ticker running');

        // stop the timer
        EventUtils.sendMouseEvent({type: 'click'}, startCancelButton);

        ok(startCancelButton.dataset.action == 'start', 'Start button present');
        ok(!document.getElementById('timer-ticker-view').classList.contains('running'), 'Timer animation stoped');
        is(timer._ticker, undefined, 'Ticker cleared');
        is(timer._endTime, undefined, 'End time deleted');

        finish();
      }, function() {
        let clockWindow = clockFrame.contentWindow;
        return 'Timer' in clockWindow;
      });
    }, 300);
  }

  waitFor(testClockTimer, function() {
    let contentWindow = shell.home.contentWindow.wrappedJSObject;
    return 'Gaia' in contentWindow;
  });
}
