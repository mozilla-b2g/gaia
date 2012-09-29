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

window.addEventListener('localized', function SettingsDateAndTime(evt) {
  var _ = navigator.mozL10n.get;

  function initDatePicker() { // Date Picker need to provide init value
    var d = new Date();
    gDatePicker.value = d.toLocaleFormat('%Y-%m-%d');
  }

  function initTimePicker() { // Time Picker need to provide init value
    var d = new Date();
    gTimePicker.value = d.toLocaleFormat('%H:%M');
  }

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

  function setTimeManualEnabled(enabled) {
    gTimeManualMenu.hidden = enabled ? true : false;
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
        // Get value from time picker. %Y-%m-%d
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

  function setTimezoneDescription(timezone) {
    _timezone = timezone;
    gTimezoneDescription.innerHTML = parseNameByTimezoneValue(timezone);
  }

  function parseNameByTimezoneValue(value) {
    for (var i = 0; i < _jsonData.length; i++) {
      for (var j = 0; j < _jsonData[i].zones.length; j++) {
        if (value == _jsonData[i].zones[j].value)
          return _jsonData[i].zones[j].name;
      }
    }
    return value;
  }

  function loadTimezoneDB(callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', _jsonUrl, true);
    try {
      xhr.responseType = 'json';
    } catch (e) { }
    xhr.overrideMimeType('application/json; charset=utf-8');
    xhr.onreadystatechange = function xhrReadystatechange(ev) {
      if (xhr.readyState !== 4)
        return;

      var response;
      if (xhr.responseType == 'json') {
        response = xhr.response;
      } else {
        try {
          response = JSON.parse(xhr.responseText);
        } catch (e) { }
      }
      _jsonData = response;

      if (typeof response !== 'object') {
        debug('Failed to load timezones.json: Malformed JSON');
        callback();
        return;
      }
      xhr = null;
      if (callback) {
        callback();
      }
    };

    xhr.send(null);
  }

  function initTimezoneContinents() {
    var content = '';
    var continentsID = 'timezone-continents-';
    for (var i = 0; i < _jsonData.length; i++) {
      content += '<li id="timezone-continents-' + continentsID + i + '">' +
                 '  <a href="#timezone-zones" id="continent-item"' +
                      'data-id="' + i + '">' + _jsonData[i].group +
                 '  </a>' +
                 '</li>';
    }
    gTimezoneContinents.innerHTML = content;
  }

  function loadZones(index) {
    var content = '';
    for (var i = 0; i < _jsonData[index].zones.length; i++) {
      var isChecked =
        (_timezone == _jsonData[index].zones[i].value) ? 'checked' : '';
      content += '<li>' +
                 '  <label>' +
                 '    <input type="radio" name="time.timezone" value="' +
                        _jsonData[index].zones[i].value + '" ' +
                        isChecked + '/>' +
                 '    <span></span>' +
                 '  </label>' +
                 '  <a>' + _jsonData[index].zones[i].name + '</a>' +
                 '</li>';
    }
    gTimezoneZones.innerHTML = content;
  }

  var settings = window.navigator.mozSettings;
  if (!settings)
    return;

  var gTimeManualMenu = document.getElementById('time-manual');
  var gDatePicker = document.getElementById('date-picker');
  var gTimePicker = document.getElementById('time-picker');
  var gDate = document.getElementById('clock-date');
  var gTime = document.getElementById('clock-time');
  var gTimezoneDescription = document.getElementById('timezoneDescription');
  var gTimezoneContinents = document.getElementById('timezone-continents');
  var gTimezoneZones = document.getElementById('timezone-zones-list');
  var _updateDateTimeout = null;
  var _updateClockTimeout = null;
  var _timezone = null;
  var _jsonUrl = 'timezones.json';
  var _jsonData = [];


  // issue #5276: PERSONALIZATION SETTINGS ->
  //             "Date & Time Page" -> toggle "24-hour Clock" ON/OFF
  // [TODO]: toggle 24-Hour clock display on/off
  // register an observer to monitor time.timezone changes
  settings.addObserver('time.timezone', function(event) {
    setTimezoneDescription(event.settingValue);
  });

  // startup, update status
  var reqTimezone = settings.createLock().get('time.timezone');
  reqTimezone.onsuccess = function dt_getStatusSuccess() {
    var lastMozSettingValue = reqTimezone.result['time.timezone'];
    setTimezoneDescription(lastMozSettingValue);
  };

  // register an observer to monitor time.nitz.automatic-update.enabled changes
  settings.addObserver('time.nitz.automatic-update.enabled', function(event) {
    setTimeManualEnabled(event.settingValue);
  });

  // startup, update status
  var reqTimeAutoUpdate =
    settings.createLock().get('time.nitz.automatic-update.enabled');
  reqTimeAutoUpdate.onsuccess = function dt_getStatusSuccess() {
    var lastMozSettingValue =
      reqTimeAutoUpdate.result['time.nitz.automatic-update.enabled'];
    setTimeManualEnabled(lastMozSettingValue);
  };

  SetTime.init();
  loadTimezoneDB(initTimezoneContinents);
  initDatePicker();
  initTimePicker();
  updateDate();
  updateClock();

  gTimezoneContinents.addEventListener('click', function clickContinents(evt) {
    var link = evt.target;
    if (!link)
      return;

    switch (link.id) {
      case 'continent-item':
        loadZones(link.dataset.id);
        break;
    }
  });

  gDatePicker.addEventListener('input', function datePickerChange() {
    setTime('date');
  });

  gTimePicker.addEventListener('input', function timePickerChange() {
    setTime('time');
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

