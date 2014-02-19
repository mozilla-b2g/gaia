var BatteryHelper = (function() {
  var battery = navigator.battery || navigator.mozBattery;
  var criticalValue = new Array();
  var length, value;

  function lowBatteryCondition(element, index, array) {
    if ((value < criticalValue[index].value) &&
        (criticalValue[index].called == 0)) {
          criticalValue[index].called = 1;
          return criticalValue[index].callback(value);
    }
  }

  function battery_status() {
    if (battery) {
      value = Math.round(battery.level * 100);
      if (navigator.battery.charging) {
        function clear(element, index, array) {
          criticalValue[index].called = 0;
        }
        criticalValue.forEach(clear);
      }
      else {
      criticalValue.forEach(lowBatteryCondition);
      }
    }
  }

  function addBatteryListener(critical, callback) {
    var duplicate = -1, temp;

    if (criticalValue.length == 0) {
      battery.addEventListener('levelchange', battery_status);
    }

    function duplicateRemove(element, index, array) {
      if (critical == criticalValue[index].value) {
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
      if (criticalValue.length == 0) {
        criticalValue.push(obj);
      }

      function sorting(element, index, array) {
        if (critical < criticalValue[index].value) {
          criticalValue.splice(index, 0, obj);
          return;
        }
        else if (index == criticalValue.length - 1) {
          criticalValue.push(obj);
          return;
        }
      }
      criticalValue.forEach(sorting);

      length = criticalValue.length;

      battery_status();
     }
  }


  function removeBatteryListener(critical) {
  /*
   * 1. check the critical in array and
   * delete the entry for the critical
   * 2. If the array is empty then call removeEventListener
   * 'levelchange'
   */
     function remove(element, index, array) {
       if (critical == criticalValue[index].value) {
         criticalValue.splice(index, 1);
         length = criticalValue.length;
         return;
       }
     }
     criticalValue.forEach(remove);

     if (length == 0) {
       battery.removeEventListener('levelchange', battery_status);
       criticalValue = null;
     }
  }

  return {
    addBatteryListener: addBatteryListener,
    removeBatteryListener: removeBatteryListener
  };
}());