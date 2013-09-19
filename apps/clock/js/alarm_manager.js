define(function(require) {
/* An Alarm's ID:
 * ID in Clock app                              ID in mozAlarms API
 * id (unique)                                  id (unique)
 *                                              type: 'normal' or 'snooze'
 *
 *
 * An alarm has its own id in the Clock app's indexDB(alarmsdb.js).
 * In order to maintain(add,remove) an alarm by mozAlarms API,
 * we prepare an registeredAlarms object that contains each alarm type:
 * 'snooze' and 'normal'
 *
 * In order to identify the active alarm which comes from mozAlarms API,
 * we pass id and type in JSON object data during adding an alarm by API.
 * id:    sync with each alarm's own id in Clock app's
 * type:  'normal', 'snooze' corresponding alarm type
 *
 *
 * An Alarm's Life:
 * We maintain an alarm's life cycle immediately when the alarm goes off.
 * If user click the snooze button when the alarm goes off,
 * we request a snooze alarm immediately.
 *
 *
 * Example:
 * (): set a alarm in start state
 * []: alarm goes off
 * O:  an once alarm
 * R:  a repeatable alarm
 * S:  a snooze alarm
 *
 * ====>: the flow of normal alarm
 * ---->: the flow of snooze alarm
 * |:     User click the snooze button
 *
 * Flow map:
 * i.  Once Alarm:
 *     (O) ====> [O]
 *
 * or  (O) ====> [O]
 *                |
 *                |  ----> [S] ----> [S]
 *
 *
 * ii. Repeat Alarm:
 *     (R) ====> [R] ====> [R]
 *                |
 *                |  ----> [S] ----> [S]
 *
 *                                              |  ----> [S] ----> [S]
 *                          |  ----> [S]        |
 *                          |                   |
 * or  (R) ====> [R] ====> [R] ====> [R] ====> [R] ====> [R] ====> [R]
 *                |
 *                |  ----> [S] ----> [S]
 */

var Utils = require('utils');
var AlarmsDB = require('alarmsdb');

var AlarmManager = {

  toggleAlarm: function am_toggleAlarm(alarm, enabled, callback) {
    alarm.setEnabled(enabled, callback);
  },

  updateAlarmStatusBar: function am_updateAlarmStatusBar() {
    var request = navigator.mozAlarms.getAll();
    request.onsuccess = function(e) {
      var hasAlarmEnabled = false;
      var generator = Utils.async.generator(function(err) {
        if (!err && navigator.mozSettings) {
          navigator.mozSettings.createLock().set({
            'alarm.enabled': hasAlarmEnabled
          });
        }
      });
      var endCb = generator();
      for (var i = 0; i < e.target.result.length && !hasAlarmEnabled; i++) {
        AlarmsDB.getAlarm(e.target.result[i].data.id,
          (function(mozAlarm, doneCb) {
          return function(err, alarm) {
            if (!err) {
              for (var j in alarm.registeredAlarms) {
                if (alarm.registeredAlarms[j] === mozAlarm.id) {
                  hasAlarmEnabled = true;
                }
              }
            }
            doneCb();
          };
        })(e.target.result[i], generator()));
      }
      endCb();
    };
    request.onerror = function(e) {
      console.error('get all alarm fail');
    };
  },

  regUpdateAlarmEnableState: function am_regUpdateAlarmEnableState(handler) {
    this._updateAlarmEableStateHandler = handler;
  }

};

return AlarmManager;
});
