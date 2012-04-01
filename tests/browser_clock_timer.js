function generatorTest() {
  waitForExplicitFinish();
  yield testApp('http://clock.gaiamobile.org/', testTimer);
  finish();
}

function testTimer(window, document, nextStep) {
  var timer = window.Timer;
  var actionButton = document.getElementById('timer-action-button');
  ok(actionButton !== null, 'action button defined');
  var durationField = document.getElementById('duration-field');
  ok(durationField !== null, 'duration field defined');
  var tickerView = document.getElementById('timer-ticker-view');
  var chronoView = document.getElementById('timer-chrono-view');

  // start the timer
  EventUtils.sendMouseEvent({type: 'click'}, actionButton);
  yield setTimeout(nextStep, 100);

  ok(actionButton.dataset.action == 'cancel', 'Cancel button present');
  ok(tickerView.classList.contains('running'), 'Timer animation running');
  ok(chronoView.innerHTML != '00:00', 'End time set');
  isnot(timer._ticker, undefined, 'Ticker running');
  ok(durationField.disabled, 'Duration is not editable');

  // cancel the timer
  EventUtils.sendMouseEvent({type: 'click'}, actionButton);
  yield setTimeout(nextStep, 100);

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
}
