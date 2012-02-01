
function test() {
  waitForExplicitFinish();

  function testClockTimer() {
    let contentWindow = shell.home.contentWindow.wrappedJSObject;
    var AppManager = contentWindow.Gaia.AppManager;

    setTimeout(function() {
      var clockFrame = AppManager.launch('../clock/clock.html');

      waitFor(function() {
        var document = clockFrame.contentWindow.document;
        var actionButton = document.getElementById('timer-action-button');
        var timer = clockFrame.contentWindow.Timer;
        var durationField = document.getElementById('duration-field');
        var tickerView = document.getElementById('timer-ticker-view');
        var chronoView = document.getElementById('timer-chrono-view');

        // start the timer
        EventUtils.sendMouseEvent({type: 'click'}, actionButton);

        ok(actionButton.dataset.action == 'cancel', 'Cancel button present');
        ok(tickerView.classList.contains('running'), 'Timer animation running');
        ok(chronoView.innerHTML != '00:00', 'End time set');
        isnot(timer._ticker, undefined, 'Ticker running');
        ok(durationField.disabled, 'Duration is not editable');

        // cancel the timer
        EventUtils.sendMouseEvent({type: 'click'}, actionButton);

        ok(actionButton.dataset.action == 'start', 'Start button present');
        ok(!tickerView.classList.contains('running'), 'Timer animation stoped');
        is(timer._ticker, undefined, 'Ticker cleared');
        ok(chronoView.innerHTML == '00:00', 'End time not displayed');
        ok(!durationField.disabled, 'Duration is editable');

        // timer duration parsing
        ok(timer.duration('4') == 4000, 'Seconds are parsed correctly');
        ok(timer.duration('01:02') == 62000, 'Minutes are parsed correctly');
        ok(timer.duration('01:01:02') == 3662000, 'Hours are parsed correctly');

        // timer duration validation
        durationField.value = 'af02';
        ok(!durationField.validity.valid, 'Duration pattern invalid');
        durationField.value = '04:04';
        ok(durationField.validity.valid, 'Duration pattern valid');
        durationField.value = '01:04:04';
        ok(durationField.validity.valid, 'Duration pattern with hours valid');

        // timer end
        EventUtils.sendMouseEvent({type: 'click'}, actionButton);
        timer.end();
        ok(chronoView.parentNode.classList.contains('ended'),
           'Ended style on chrono view');

        finish();
      }, function() {
        let clockWindow = clockFrame.contentWindow;
        return 'Timer' in clockWindow && clockWindow.document.getElementById('timer-action-button') != null;
      });
    }, 300);
  }

  waitFor(testClockTimer, function() {
    let contentWindow = shell.home.contentWindow.wrappedJSObject;
    return 'Gaia' in contentWindow;
  });
}
