/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
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

navigator.mozL10n.ready(function SettingsDateAndTime() {
  var _ = navigator.mozL10n.get;

  function updateDate() {
    var d = new Date();
    var f = new navigator.mozL10n.DateTimeFormat();
    gDate.textContent = f.localeFormat(d, '%x');

    var remainMillisecond = (24 - d.getHours()) * 3600 * 1000 -
                            d.getMinutes() * 60 * 1000 -
                            d.getMilliseconds();
    _updateDateTimeout = window.setTimeout(function updateDateTimeout() {
      updateDate();
    }, remainMillisecond);
  }

  function updateClock() {
    var d = new Date();
    var f = new navigator.mozL10n.DateTimeFormat();
    var format = _('shortTimeFormat');
    gTime.textContent = f.localeFormat(d, format);

    _updateClockTimeout = window.setTimeout(function updateClockTimeout() {
      updateClock();
    }, (59 - d.getSeconds()) * 1000);
  }

  function setTime(type) {
    var pDate = '';
    var pTime = '';
    var d = new Date();
    switch (type) {
      case 'date':
        // Get value from date picker.
        pDate = gDatePicker.value;  // Format: 2012-09-01
        pTime = d.toLocaleFormat('%H:%M');
        break;

      case 'time':
        // Get value from time picker.
        pDate = d.toLocaleFormat('%Y-%m-%d');
        pTime = gTimePicker.value;  // Format: 0:02, 8:05, 23:45
        break;
    }
    if (pTime.indexOf(':') == 1) {  // Format: 8:05 --> 08:05
      pTime = '0' + pTime;
    }
    // Construct a Date object with date time
    // specified in a ISO 8601 string (YYYY-MM-DDTHH:MM)
    var newDate = new Date(pDate + 'T' + pTime);
    SetTime.set(newDate);
  }

  var settings = window.navigator.mozSettings;
  if (!settings)
    return;

  var gTimeAutoSwitch = document.getElementById('time-auto');
  var gTimezoneRegion = document.getElementById('timezone-region');
  var gTimezoneCity = document.getElementById('timezone-city');
  var gDatePicker = document.getElementById('date-picker');
  var gTimePicker = document.getElementById('time-picker');
  var gDate = document.getElementById('clock-date');
  var gTime = document.getElementById('clock-time');
  var _updateDateTimeout = null;
  var _updateClockTimeout = null;


  /**
   * Monitor time.nitz.automatic-update.enabled changes
   */

  var kTimeAutoEnabled = 'time.nitz.automatic-update.enabled';

  function setTimeAutoEnabled(enabled) {
    gTimeAutoSwitch.dataset.state = enabled ? 'auto' : 'manual';
  }

  settings.addObserver(kTimeAutoEnabled, function(event) {
    setTimeAutoEnabled(!!event.settingValue);
  });

  var reqTimeAutoEnabled = settings.createLock().get(kTimeAutoEnabled);
  reqTimeAutoEnabled.onsuccess = function dt_getStatusSuccess() {
    setTimeAutoEnabled(reqTimeAutoEnabled.result[kTimeAutoEnabled]);
  };


  /**
   * Hide automatic time setting if NITZ is not available
   */

  var kTimeAutoAvailable = 'time.nitz.available';

  function setTimeAutoAvailable(available) {
    gTimeAutoSwitch.hidden = !available;
    if (!available) { // disable the time auto-update if N/A
      var cset = {};
      cset[kTimeAutoEnabled] = false;
      settings.createLock().set(cset);
    }
  }

  settings.addObserver(kTimeAutoAvailable, function(event) {
    setTimeAutoAvailable(!!event.settingValue);
  });

  var reqTimeAutoAvailable = settings.createLock().get(kTimeAutoAvailable);
  reqTimeAutoAvailable.onsuccess = function nitz_getStatusSuccess() {
    setTimeAutoAvailable(!!reqTimeAutoAvailable.result[kTimeAutoAvailable]);
  };


  /**
   * UI startup
   */

  SetTime.init();
  updateDate();
  updateClock();

  // monitor time.timezone changes, see /shared/js/tz_select.js
  tzSelect(gTimezoneRegion, gTimezoneCity);

  gDatePicker.addEventListener('input', function datePickerChange() {
    setTime('date');
    // Clean up the value of picker once we get date set by the user.
    // It will get new date according system time when pop out again.
    gDatePicker.value = '';
  });

  gTimePicker.addEventListener('input', function timePickerChange() {
    setTime('time');
    // Clean up the value of picker once we get time set by the user.
    // It will get new time according system time when pop out again.
    gTimePicker.value = '';
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

