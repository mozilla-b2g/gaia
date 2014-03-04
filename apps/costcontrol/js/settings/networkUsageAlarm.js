/* exported NetworkUsageAlarm */
'use strict';
var NetworkUsageAlarm = (function() {

  function _addAlarm(networkInterface, value, onsuccess, onerror) {
    if (!networkInterface) {
      console.error('Error, the network interface is not defined when trying ' +
                    'to add an alarm');
      (typeof onerror === 'function') && onerror();
      return;
    }
    if (value === null || typeof value === 'undefined') {
      console.error('Limit value is undefined, impossible add an alarm');
      (typeof onerror === 'function') && onerror();
      return;
    }

    var request = navigator.mozNetworkStats.addAlarm(networkInterface, value);
    request.onsuccess = onsuccess;
    request.onerror = function error(e) {
      console.error('Error, when trying to addAlarm to the interfaceId: ' +
                    networkInterface.id + ' and limit: ' + value);
      (typeof onerror === 'function') && onerror();
    };
  }

  function _clearAlarms(networkInterface, callback) {
    if (!networkInterface) {
      console.error('Error, the network interface is not defined when trying ' +
                    'to remove alarms');
      return;
    }
    var request = navigator.mozNetworkStats.getAllAlarms(networkInterface);
    request.onsuccess = function success() {
      var alarmList = request.result;
      var pendingRequest = alarmList.length;

      function checkForCompletion() {
        pendingRequest--;
        if (pendingRequest === 0) {
          (typeof callback === 'function') && callback();
        }
      }

      function _onErrorRemoveAlarm() {
        console.error('Error when trying to remove one alarm.');
        checkForCompletion();
      }

      for (var i = 0; i < alarmList.length; i++) {
        if (alarmList[i] && alarmList[i].alarmId) {
          var rA = navigator.mozNetworkStats.removeAlarms(alarmList[i].alarmId);
          rA.onsuccess = checkForCompletion;
          rA.onerror = _onErrorRemoveAlarm;
        }
      }

      if (pendingRequest === 0) {
        (typeof callback === 'function') && callback();
      }
    };

    request.onerror = function error() {
      console.error('Error when trying to get alarms from the API to clear it');
    };
  }

  function _updateAlarm(dataInterface, value, onsuccess, onerror) {
    if (dataInterface && value) {
      var addNewAlarm = _addAlarm.bind(null, dataInterface, value, onsuccess,
                                       onerror);
      _clearAlarms(dataInterface, addNewAlarm);
    } else {
      if (!dataInterface) {
        console.error('Error, the network interface is not defined when ' +
                      'trying to update an alarm');
      } else {
         console.error('Error, the data limit value is not defined when ' +
                       'trying to update an alarm');
      }
      (typeof onerror === 'function') && onerror();
    }
  }

  return {
    updateAlarm : _updateAlarm,
    clearAlarms: _clearAlarms
  };
}());
