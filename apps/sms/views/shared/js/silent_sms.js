/* global asyncStorage, Promise, TaskRunner */
/* exported SilentSms */
'use strict';

var SilentSms = (function () {
  var NO_ALARM_ID = -1;
  // The maximum amount of time that the SmsManager waits for a message before
  // disabling automatically the silent mode is five minutes.
  var SERVICE_TIMEOUT = 5 * 60 * 1000;
  var taskQueue;

  function init() {
    taskQueue = new TaskRunner();
    if (!window.navigator.mozSetMessageHandler) {
      // bailout if we're in Firefox
      return;
    }

    // Msg from Usage (activation / deactivation)
    window.navigator.mozSetMessageHandler('connection',
      function onConnected(request) {
        if (request.keyword !== 'costcontrolSmsQuery') {
          return;
        }
        var port = request.port;
        port.onmessage = function onReceivedMessage(evt) {
          var data = evt.data;
          switch (data.action) {
          case 'enable':
            taskQueue.push(function() {
              return SilentSms.enableSilentModeFor(data.smsNumbers, data.type)
                .then(updateUsageSilentSms)
                .then(port.postMessage.bind(port, 'silentSMSEnabled'));
            });
            break;
          case 'disable':
            taskQueue.push(function() {
              return SilentSms.disableSilentModeFor(data.type)
                .then(updateUsageSilentSms)
                .then(port.postMessage.bind(port, 'silentSMSDisabled'));
            });
            break;
          }
        };
      }
    );

    // Deactivated silentSms mode by alarm
    window.navigator.mozSetMessageHandler('alarm', function _onAlarm(alarm) {
      if (alarm.data.alarmType === 'silentSmsTimeout') {
        SilentSms.disableSilentModeFor(alarm.data.type)
          .then(updateUsageSilentSms);
      }
    });
  }

  function getUsageSilentSms() {
    return new Promise(function(resolve, reject) {
      asyncStorage.getItem('usageSilentSms', function(usageSilentSms) {
        resolve(usageSilentSms || {});
      });
    });
  }

  function removeAlarmTimeout(alarmId) {
    // There is already an alarm, remove it
    if (alarmId && alarmId !== NO_ALARM_ID) {
      navigator.mozAlarms.remove(alarmId);
    }
  }

  function addAlarmTimeout(type, delay) {
    return new Promise(function doEnablingSilentMode(resolve, reject) {
      var date = new Date();
      date.setTime(date.getTime() + delay);
      var request = navigator.mozAlarms.add(date, 'ignoreTimezone',
                                            {alarmType: 'silentSmsTimeout',
                                             type: type });
      request.onsuccess = function _alarmSet(evt) {
        var alarmId = evt.target.result;
        resolve(alarmId);
      };
      request.onerror = function _onError() {
        var errorMsg = 'Failed to set timeout for ' + type + 'request';
        reject(new Error(errorMsg));
      };
    });
  }

  // The enabling silentMode process consist on two steps:
  //   1. Enabling silentMode for the provided number
  //   2. Activating alarm for TimeOut
  function enableSilentModeFor(smsNumbers, type) {
    function _removeAlarmTimeout(usageSilentSms) {
      if (usageSilentSms && usageSilentSms[type] &&
          usageSilentSms[type].alarmId !== NO_ALARM_ID) {
        removeAlarmTimeout(usageSilentSms[type].alarmId);
      }
    }

    function handleErrorAddingAlarm(error) {
      console.error(error.toString());
      return NO_ALARM_ID;
    }

    return getUsageSilentSms().then(function(usageSilentSms) {
      function refreshUsageSilentSms(alarmId) {
        usageSilentSms[type] = {
          smsNumbers: smsNumbers,
          alarmId: alarmId
        };
        return usageSilentSms;
      }
      _removeAlarmTimeout(usageSilentSms);
      return addAlarmTimeout(type, SERVICE_TIMEOUT)
          .catch(handleErrorAddingAlarm)
          .then(refreshUsageSilentSms);
    });

  }

  function disableSilentModeFor(type) {
    return getUsageSilentSms().then(function(usageSilentSms) {
      if (usageSilentSms && usageSilentSms[type] &&
          usageSilentSms[type].alarmId !== NO_ALARM_ID) {
        removeAlarmTimeout(usageSilentSms[type].alarmId);
      }
      usageSilentSms[type] = null;
      return usageSilentSms;
    });
  }

  function updateUsageSilentSms(usageSilentSms) {
    usageSilentSms.smsIndex = getIndex(usageSilentSms);
    asyncStorage.setItem('usageSilentSms', usageSilentSms);
  }

  function getIndex(usageSilentSms) {
    var newIndex = [];
    Object.keys(usageSilentSms).forEach(function(silentRequest) {
      var silentSmsRequest = usageSilentSms[silentRequest];
      if (silentSmsRequest && silentSmsRequest.hasOwnProperty('smsNumbers')) {
        newIndex = newIndex.concat(silentSmsRequest.smsNumbers);
      }
    });
    return newIndex;
  }

  function checkSilentModeFor(smsNumber) {
    return taskQueue.push(function() {
      function checkSilentMode(usageSilentSms) {
        return usageSilentSms && usageSilentSms.smsIndex &&
               usageSilentSms.smsIndex.indexOf(smsNumber) !== -1;
      }
      return getUsageSilentSms().then(checkSilentMode);
    });
  }

  return {
    init: init,
    enableSilentModeFor: enableSilentModeFor,
    disableSilentModeFor: disableSilentModeFor,
    checkSilentModeFor: checkSilentModeFor
  };
}());
