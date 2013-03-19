
'use strict';

// Checks for a SIM change
function checkSIMChange(callback) {
  asyncStorage.getItem('lastSIM', function _compareWithCurrent(lastSIM) {
    var currentSIM = window.navigator.mozMobileConnection.iccInfo.iccid;
    if (lastSIM !== currentSIM) {
      debug('SIM change!');
      MindGap.updateTagList(currentSIM);
    }
    ConfigManager.requestSettings(function _onSettings(settings) {
      if (settings.nextReset) {
        setNextReset(settings.nextReset, callback);
        return;
      }

      if (callback) {
        callback();
      }
    });
  });
}

function checkDataUsageNotification(settings, usage, callback) {
  var proxy = document.getElementById('message-handler').contentWindow;
  var f = proxy ? proxy.checkDataUsageNotification :
                  window.checkDataUsageNotification;
  return f(settings, usage, callback);
}

// Waits for DOMContentLoaded and messagehandlerready, then call the callback
function waitForDOMAndMessageHandler(window, callback) {
  var remainingSteps = 2;
  function checkReady(evt) {
    debug(evt.type, 'event received!');
    remainingSteps--;

    // Once all events are received, execute the callback
    if (!remainingSteps) {
      window.removeEventListener('DOMContentLoaded', checkReady);
      window.removeEventListener('messagehandlerready', checkReady);
      debug('DOMContentLoaded and messagehandlerready received. Starting');
      callback();
    }
  }

  window.addEventListener('DOMContentLoaded', checkReady);
  window.addEventListener('messagehandlerready', checkReady);
}

function addAlarmTimeout(type, delay) {
  var proxy = document.getElementById('message-handler').contentWindow;
  return proxy.addAlarmTimeout(type, delay);
}

function setNextReset(when, callback) {
  var proxy = document.getElementById('message-handler');
  return proxy ? proxy.contentWindow.setNextReset(when, callback) :
                 window.setNextReset(when, callback);
}

function getTopUpTimeout(callback) {
  var proxy = document.getElementById('message-handler');
  return proxy ? proxy.contentWindow.getTopUpTimeout(callback) :
                 window.getTopUpTimeout(callback);
}

// Next automatic reset date based on user preferences
function updateNextReset(trackingPeriod, value, callback) {
  if (trackingPeriod === 'never') {
    setNextReset(null, callback); // remove any alarm
    return;
  }

  var nextReset, today = new Date();

  // Recalculate with month period
  if (trackingPeriod === 'monthly') {
    var month, year;
    var monthday = parseInt(value, 10);
    month = today.getMonth();
    year = today.getFullYear();
    if (today.getDate() >= monthday) {
      month = (month + 1) % 12;
      if (month === 0) {
        year++;
      }
    }
    nextReset = new Date(year, month, monthday);

  // Recalculate with week period
  } else if (trackingPeriod === 'weekly') {
    var oneDay = 24 * 60 * 60 * 1000;
    var weekday = parseInt(value, 10);
    var daysToTarget = weekday - today.getDay();
    if (daysToTarget <= 0) {
      daysToTarget = 7 + daysToTarget;
    }
    nextReset = new Date();
    nextReset.setTime(nextReset.getTime() + oneDay * daysToTarget);
    toMidnight(nextReset);
  }

  // remove oldAlarm and set the new one
  setNextReset(nextReset, callback);
}

function resetData() {

  // Sets the fixing value for the current SIM
  asyncStorage.getItem('dataUsageTags', function _updateTags(tags) {
    if (!tags || !tags.length) {
      console.error('dataUsageTags does not exists!');
      return;
    }

    // Get current mobile data
    var now = new Date();
    var mobileRequest = window.navigator.mozNetworkStats.getNetworkStats({
      start: now,
      end: now,
      connectionType: 'mobile'
    });
    mobileRequest.onsuccess = function _onMobileForToday() {
      var data = mobileRequest.result.data;
      debug('Data length should be 1 and it is', data.length);
      var currentDataUsage = 0;
      if (data[0].rxBytes) {
        currentDataUsage += data[0].rxBytes;
      }
      if (data[0].txBytes) {
        currentDataUsage += data[0].txBytes;
      }

      // Adds the fixing
      var tag = tags[tags.length - 1];
      tag.fixing.push([now, currentDataUsage]);

      // Remove the previous ones
      for (var i = tags.length - 2; i >= 0; i--) {
        var ctag = tags[i];
        if (ctag.sim === tag.sim) {
          tags.splice(i, 1);
        }
      }
      debug('After reset', tags);

      asyncStorage.setItem('dataUsageTags', tags, function _done() {
        ConfigManager.setOption({ lastDataReset: now });
      });
    };

    var wifiRequest = window.navigator.mozNetworkStats.getNetworkStats({
      start: now,
      end: now,
      connectionType: 'wifi'
    });
    wifiRequest.onsuccess = function _onWiFiForToday() {
      var data = wifiRequest.result.data;
      debug('Data length should be 1 and it is', data.length);
      var currentWifiUsage = 0;
      if (data[0].rxBytes) {
        currentWifiUsage += data[0].rxBytes;
      }
      if (data[0].txBytes) {
        currentWifiUsage += data[0].txBytes;
      }
      asyncStorage.setItem('wifiFixing', currentWifiUsage);
    };

  });
}

function resetTelephony() {
  ConfigManager.setOption({
    lastTelephonyReset: new Date(),
    lastTelephonyActivity: {
      calltime: 0,
      smscount: 0,
      timestamp: new Date()
    }
  });
}

function resetAll() {
  resetData();
  resetTelephony();
}

function getDataLimit(settings) {
  var multiplier = (settings.dataLimitUnit === 'MB') ?
                   1000000 : 1000000000;
  return settings.dataLimitValue * multiplier;
}

function formatTimeHTML(timestampA, timestampB) {
  // No interval
  if (typeof timestampB === 'undefined') {
    return '<time>' + formatTime(timestampA) + '</time>';
  }

  // Same day case
  var dateA = new Date(timestampA);
  var dateB = new Date(timestampB);
  if (dateA.getFullYear() === dateB.getFullYear() &&
      dateA.getMonth() === dateB.getMonth() &&
      dateA.getDay() === dateB.getDay()) {

    return formatTimeHTML(timestampB);
  }

  // Interval
  return '<time>' + formatTime(timestampA, _('short-date-format')) + '</time>' +
         ' – <time>' + formatTime(timestampB) + '</time>';
}

function localizeWeekdaySelector(selector) {
  var weekStartsOnMonday =
    !!parseInt(navigator.mozL10n.get('weekStartsOnMonday'), 10);
  debug('Week starts on monday?', weekStartsOnMonday);
  var monday = selector.querySelector('.monday');
  var sunday = selector.querySelector('.sunday');
  var list = monday.parentNode;
  if (weekStartsOnMonday) {
    debug('Monday, Tuesday...');
    list.insertBefore(monday, list.childNodes[0]); // monday is the first
    list.appendChild(sunday); // sunday is the last
  } else {
    debug('Sunday, Monday...');
    list.insertBefore(sunday, list.childNodes[0]); // sunday is the first
    list.insertBefore(monday, sunday.nextSibling); // monday is the second
  }
}
