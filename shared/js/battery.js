/* exported  BatteryHelper */

'use strict';

/* We cannot accept different callback on the same battery level */

var BatteryHelper = (function() {
  var battery = navigator.battery || navigator.mozBattery;
  var criticalValue = [];
  var length, value;


  function batteryLevel() {
    if (battery) {
      value = Math.round(battery.level * 100);
      return value;
    }
  }

  function isCharging() {
    if (battery) {
      return battery.charging;
    }
  }
  function lowBatteryCondition(element, index, array) {
    if ((value < criticalValue[index].value) &&
        !(criticalValue[index].called)) {
          if ((index >= 1) && (criticalValue[index - 1].called)) {
            return;
          }
          criticalValue[index].called = 1;
          return criticalValue[index].callback(value);
    }
  }

  function clear(element, index, array) {
    criticalValue[index].called = 0;
  }

  function batteryStatus() {
    if (battery) {
      value = Math.round(battery.level * 100);
      if (navigator.battery.charging) {
        criticalValue.forEach(clear);
      }
      else {
        criticalValue.forEach(lowBatteryCondition);
      }
    }
  }

  function addBatteryListener(critical, callback) {
    var duplicate = -1;

    if (criticalValue.length === 0) {
      battery.addEventListener('levelchange', batteryStatus);
      battery.addEventListener('chargingchange', batteryStatus);
    }

    function duplicateRemove(element, index, array) {
      if (critical === criticalValue[index].value) {
        duplicate = 0;
        criticalValue[index].callback = callback;
        return;
      }
    }
    criticalValue.forEach(duplicateRemove);

    if (duplicate == -1) {

      var obj = {
        value: critical,
        called: 0,
        callback: callback
      };

      criticalValue.push(obj);

      criticalValue.sort(function(a, b) {
        return a.value - b.value;
      });

      length = criticalValue.length;

      batteryStatus();
    }
  }


  /**
   * 1. check the critical in array and
   * delete the entry for the critical
   * 2. If the array is empty then call removeEventListener
   * 'levelchange'
   */
  function removeBatteryListener(critical) {

    function remove(element, index, array) {
      if (critical == criticalValue[index].value) {
        criticalValue.splice(index, 1);
        length = criticalValue.length;
        return;
      }
    }
    criticalValue.forEach(remove);
     if (length === 0) {
       battery.removeEventListener('levelchange', batteryStatus);
       criticalValue = null;
    }
  }

  return {
    addBatteryListener: addBatteryListener,
    removeBatteryListener: removeBatteryListener,
    batteryLevel: batteryLevel,
    isCharging: isCharging
  };
}());
