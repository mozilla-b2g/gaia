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
  var gTimezone = document.getElementById('timezone-raw');
  var gTimezoneValue = document.getElementById('timezone-value');
  var _updateDateTimeout = null;
  var _updateClockTimeout = null;
  var _timeAutoEnabled = false;

  function updateUI() {
    gDatePicker.disabled = _timeAutoEnabled;
    gTimePicker.disabled = _timeAutoEnabled;
    gTimezoneRegion.disabled = (_timezoneAutoAvailable && _timeAutoEnabled);
    gTimezoneCity.disabled = (_timezoneAutoAvailable && _timeAutoEnabled);
    gTimezone.hidden = !(_timezoneAutoAvailable && _timeAutoEnabled);

    if (_timeAutoEnabled) {
      document.getElementById('time-manual').classList.add('disabled');
      if (_timezoneAutoAvailable) {
        document.getElementById('timezone').classList.add('disabled');
      }
    } else {
      document.getElementById('time-manual').classList.remove('disabled');
      document.getElementById('timezone').classList.remove('disabled');
    }
  }

  /**
   * Monitor time.clock.automatic-update.enabled changes.
   * Also sync to time.timezone.automatic-update.enabled.
   */
  var kClockAutoEnabled = 'time.clock.automatic-update.enabled';
  var kTimezoneAutoEnabled = 'time.timezone.automatic-update.enabled';

  function setTimeAutoEnabled(enabled) {
    _timeAutoEnabled = enabled;
    gTimeAutoSwitch.dataset.state = enabled ? 'auto' : 'manual';
    gTimezone.hidden = !(_timezoneAutoAvailable && _timeAutoEnabled);

    var cset = {};
    cset[kTimezoneAutoEnabled] = enabled;
    settings.createLock().set(cset);

    updateUI();
    if (_timeAutoEnabled) {
      return;
    }

    // Reset the timezone to the previous user selected value
    var reqUserTZ = settings.createLock().get('time.timezone.user-selected');
    reqUserTZ.onsuccess = function dt_getUserTimezoneSuccess() {
      var userSelTimezone = reqUserTZ.result['time.timezone.user-selected'];
      if (userSelTimezone) {
        settings.createLock().set({'time.timezone': userSelTimezone});
      }
    };
  }

  settings.addObserver(kClockAutoEnabled, function(event) {
    setTimeAutoEnabled(!!event.settingValue);
  });

  var reqClockAutoEnabled = settings.createLock().get(kClockAutoEnabled);
  reqClockAutoEnabled.onsuccess = function clock_getStatusSuccess() {
    setTimeAutoEnabled(reqClockAutoEnabled.result[kClockAutoEnabled]);
  };

  /**
   * Hide automatic time setting if no source available.
   */

  var _clockAutoAvailable = false;
  var _timezoneAutoAvailable = false;
  var kClockAutoAvailable = 'time.clock.automatic-update.available';
  var kTimezoneAutoAvailable = 'time.timezone.automatic-update.available';

  function setTimeAutoAvailable(available) {
    gTimeAutoSwitch.hidden = !available;
    if (!available) { // disable the time auto-update if N/A
      var cset = {};
      cset[kClockAutoEnabled] = false;
      cset[kTimezoneAutoEnabled] = false;
      settings.createLock().set(cset);
    }
  }

  function setClockAutoAvailable(available) {
    _clockAutoAvailable = available;
    setTimeAutoAvailable(_clockAutoAvailable || _timezoneAutoAvailable);
  }

  function setTimezoneAutoAvailable(available) {
    var needUpdateUI = (_timezoneAutoAvailable != available);
    _timezoneAutoAvailable = available;
    setTimeAutoAvailable(_clockAutoAvailable || _timezoneAutoAvailable);
    if (needUpdateUI) {
      updateUI();
    }
  }

  settings.addObserver(kClockAutoAvailable, function(event) {
    setClockAutoAvailable(!!event.settingValue);
  });

  settings.addObserver(kTimezoneAutoAvailable, function(event) {
    setTimezoneAutoAvailable(!!event.settingValue);
  });

  var reqClockAutoAvailable = settings.createLock().get(kClockAutoAvailable);
  reqClockAutoAvailable.onsuccess = function clock_getStatusSuccess() {
    setClockAutoAvailable(!!reqClockAutoAvailable.result[kClockAutoAvailable]);
  };

  var reqTimezoneAutoAvailable =
    settings.createLock().get(kTimezoneAutoAvailable);
  reqTimezoneAutoAvailable.onsuccess = function timezone_getStatusSuccess() {
    setTimezoneAutoAvailable(
      !!reqTimezoneAutoAvailable.result[kTimezoneAutoAvailable]);
  };

  function updateTimezone(timezone) {
    gTimezoneValue.textContent = timezone;
  }

  settings.addObserver('time.timezone', function(event) {
    updateTimezone(event.settingValue);
  });

  var reqTimezone = settings.createLock().get('time.timezone');
  reqTimezone.onsuccess = function timezone_getStatusSuccess() {
    updateTimezone(reqTimezone.result['time.timezone']);
  };

  /**
   * UI startup
   */

  SetTime.init();
  updateDate();
  updateClock();

  // monitor time.timezone changes, see /shared/js/tz_select.js
  var noOp = function() {};
  tzSelect(gTimezoneRegion, gTimezoneCity, noOp, noOp);

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

  window.addEventListener('localized', function localized() {
    // Update date and time locale when language is changed
    var d = new Date();
    var f = new navigator.mozL10n.DateTimeFormat();
    var format = _('shortTimeFormat');
    gDate.textContent = f.localeFormat(d, '%x');
    gTime.textContent = f.localeFormat(d, format);
  });

  document.addEventListener('visibilitychange', function visibilityChange() {
    if (!document.hidden) {
      updateDate();
      updateClock();
    } else {
      window.clearTimeout(_updateDateTimeout);
      window.clearTimeout(_updateClockTimeout);
    }
  });
});

