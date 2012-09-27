/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var SetTime = (function SetTime() {
  var _mozTime = null;

  function set(date) {
    _mozTime.set(date);
  }

  function _init() {
    _mozTime = window.navigator.mozTime;
    if (!_mozTime) {
      console.error('Could not get window.navigator.mozTime');
      return;
    }
  }

  return {
    init: _init,
    set: set
  };

})();

window.addEventListener('localized', function SettingsDateAndTime(evt) {

  var _ = navigator.mozL10n.get;

  function initDatePicker() { // Date Picker need to provide init value
    var d = new Date();
    gDatePicker.value = d.getFullYear() + '-' +
                        d.getMonth() + '-' +
                        d.getDate();
  }

  function initTimePicker() { // Time Picker need to provide init value
    var d = new Date();
    gTimePicker.value = d.getHours() + ':' + d.getMinutes();
  }

  function updateDate() {
    var d = new Date();
    var f = new navigator.mozL10n.DateTimeFormat();
    var format = navigator.mozL10n.get('dateFormat');
    gDate.textContent = f.localeFormat(d, format);

    var remainMillisecond = (24 - d.getHours()) * 3600 * 1000 -
                            d.getMinutes() * 60 * 1000 -
                            d.getMilliseconds();
    _updateDateTimeout =
    window.setTimeout(function updateDateTimeout() {
      updateDate();
    }, remainMillisecond);
  }

  function updateClock() {
    var d = new Date();
    var f = new navigator.mozL10n.DateTimeFormat();
    var localeTimeFormat = _('timeFormat');
    var is12hFormat = (localeTimeFormat.indexOf('%p') >= 0);
    var t =
        f.localeFormat(d, (is12hFormat ? '%I:%M' : '%H:%M')).replace(/^0/, '');
    var p = is12hFormat ? f.localeFormat(d, '%p') : '';
    gClockTime.textContent = t;
    gClockHourState.textContent = p;
    _updateClockTimeout =
    window.setTimeout(function updateClockTimeout() {
      updateClock();
    }, (59 - d.getSeconds()) * 1000);
  }

  function setTimeManualEnabled(enabled) {
    gTimeManualMenu.hidden = enabled ? true : false;
  }

  var settings = window.navigator.mozSettings;
  if (!settings)
    return;

  var gTimeManualMenu = document.getElementById('time-manual');
  var gDatePicker = document.getElementById('date-picker');
  var gTimePicker = document.getElementById('time-picker');
  var gDate = document.getElementById('clock-date');
  var gClockTime = document.getElementById('clock-time');
  var gClockHourState = document.getElementById('clock-hour24-state');
  var gConfirmTimeButton = document.getElementById('confirmTime-button');
  var _updateDateTimeout = null;
  var _updateClockTimeout = null;

  // issue #5276: PERSONALIZATION SETTINGS ->
  //             "Date & Time Page" -> toggle "24-hour Clock" ON/OFF
  // [TODO]: toggle 24-Hour clock display on/off
  // register an observer to monitor time.timezone changes
  settings.addObserver('time.timezone', function(event) {
    //  issue #3989 PERSONALIZATION SETTINGS ->
    //              "Date & Time Page" -> Manual -> Set Time Zone
    // [TODO]: update display time zone
  });

  // register an observer to monitor time.nitz.automatic-update.enabled changes
  settings.addObserver('time.nitz.automatic-update.enabled', function(event) {
    setTimeManualEnabled(event.settingValue);
  });

  // startup, update status
  var req = settings.createLock().get('time.nitz.automatic-update.enabled');
  req.onsuccess = function dt_getStatusSuccess() {
    setTimeManualEnabled(req.result['time.nitz.automatic-update.enabled']);
  };

  SetTime.init();
  initDatePicker();
  initTimePicker();
  updateDate();
  updateClock();

  // XXX: No change event from date/time picker
  // Bug 793553 -
  // [b2g] oninput is not fired when the content of an input field is changed
  // Use confirm button to set the picked time
  gDatePicker.addEventListener('change', function datePickerChange() {
    // [TODO]: Set time by the changed date.
  });
  gTimePicker.addEventListener('change', function timePickerChange() {
    // [TODO]: Set time by the changed time.
  });

  gConfirmTimeButton.addEventListener('click', function confirmTime() {
    // Get value from date picker.
    var pDate = gDatePicker.value;  // Format: 2012-09-01
    // Get value from time picker.
    var pTime = gTimePicker.value;  // Format: 0:02, 8:05, 23:45
    if (pTime.indexOf(':') == 1) {  // Format: 8:05 --> 08:05
      pTime = '0' + pTime;
    }
    // Construct a Date object with date time
    // specified in a ISO 8601 string (YYYY-MM-DDTHH:MM)
    var newDate = new Date(pDate + 'T' + pTime);
    SetTime.set(newDate);
  });

  window.addEventListener('moztimechange', function moztimechange() {
    window.clearTimeout(_updateDateTimeout);
    window.clearTimeout(_updateClockTimeout);
    updateDate();
    updateClock();
  });

  document.addEventListener('mozvisibilitychange', function visibilityChange() {
    if (!document.mozHidden) {
      updateDate();
      updateClock();
    } else {
      window.clearTimeout(_updateDateTimeout);
      window.clearTimeout(_updateClockTimeout);
    }
  });
});
