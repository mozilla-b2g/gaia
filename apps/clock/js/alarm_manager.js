/* An Alarm's ID:
 * ID in Clock app                              ID in mozAlarms API
 * id (unique)                                  id (unique)
 * normalAlarmId (comes from mozAlarms API)     type: 'normal' or 'snooze'
 * snoozeAlarmId (comes from mozAlarms API)
 *
 * An alarm has its own id in the Clock app's indexDB(alarmsdb.js).
 * In order to maintain(add,remove) an alarm by mozAlarms API,
 * we prepare two request id(normalAlarmId, snoozeAlarmId) for each alarm.
 * The two id is used to store return id from mozAlarms API.
 * normalAlarmId: Maintain an alarm's life(once, repeat).
 * snoozeAlarmId: Maintain an snooze alarm's life only(snooze).
 *                (If user click snooze button,
 *                 we always maintain it with snoozeAlarmId.)
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
 * we request a snooze alarm with snoozeAlarmId immediately.
 *
 *
 * Example:
 * (): set a alarm in start state
 * []: alarm goes off
 * O:  an once alarm
 * R:  a repeatable alarm
 * S:  a snooze alarm
 *
 * ====>: the flow of normalAlarmId
 * ---->: the flow of snoozeAlarmId
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
var AlarmManager = {

  toggleAlarm: function am_toggleAlarm(alarm, enabled, callback) {
    if (enabled) {
      this.set(alarm, false, callback);
    } else {
      this.unset(alarm, callback);
    }
  },

  set: function am_set(alarm, bSnooze, callback) {
    // Do not need to unset repeat alarm when set a snooze alarm
    if (!bSnooze) {
      // Unset the requested alarm which does not goes off
      this.unset(alarm);
    }

    var nextAlarmFireTime = null;
    if (bSnooze) {
      nextAlarmFireTime = new Date();
      nextAlarmFireTime.setMinutes(nextAlarmFireTime.getMinutes() +
                                   alarm.snooze);
    } else {
      nextAlarmFireTime = getNextAlarmFireTime(alarm);
    }

    if (!navigator.mozAlarms)
      return;

    var type = bSnooze ? 'snooze' : 'normal';
    var data = {
      id: alarm.id,
      type: type
    };
    var request = navigator.mozAlarms.add(
                    nextAlarmFireTime,
                    'ignoreTimezone',
                    data);

    // give the alarm id for the request
    var self = this;
    request.onsuccess = function(e) {
      if (bSnooze) {
        alarm.snoozeAlarmId = e.target.result;
      } else {
        alarm.normalAlarmId = e.target.result;
      }

      // save the AlarmAPI's request id to DB
      AlarmsDB.putAlarm(alarm, function am_putAlarm(alarm) {
        if (self._updateAlarmEableStateHandler)
          self._updateAlarmEableStateHandler(alarm);

        if (callback)
          callback(alarm);
      });
      self.updateAlarmStatusBar();
      BannerView.setStatus(nextAlarmFireTime);
    };
    request.onerror = function(e) {
      console.log('onerror!!!!');
      var logInfo = bSnooze ? ' snooze' : '';
      console.log('set' + logInfo + ' alarm fail');
    };

  },

  unset: function am_unset(alarm, callback) {
    var isNeedToUpdateAlarmDB = false;
    if (alarm.normalAlarmId) {
      navigator.mozAlarms.remove(alarm.normalAlarmId);
      alarm.normalAlarmId = '';
      isNeedToUpdateAlarmDB = true;
    }
    if (alarm.snoozeAlarmId) {
      navigator.mozAlarms.remove(alarm.snoozeAlarmId);
      alarm.snoozeAlarmId = '';
      isNeedToUpdateAlarmDB = true;
    }
    if (isNeedToUpdateAlarmDB) {
      // clear the AlarmAPI's request id to DB
      var self = this;
      AlarmsDB.putAlarm(alarm, function am_putAlarm(alarm) {
        if (self._updateAlarmEableStateHandler)
          self._updateAlarmEableStateHandler(alarm);

        if (callback)
          callback(alarm);
      });
      this.updateAlarmStatusBar();
    }

  },

  delete: function am_delete(alarm, callback) {
    if (alarm.normalAlarmId || alarm.snoozeAlarmId)
      this.toggleAlarm(alarm, false);

    var self = this;
    AlarmsDB.deleteAlarm(alarm.id, function am_deletedAlarm() {
      if (callback)
        callback();

    });
  },

  getAlarmList: function am_getAlarmList(callback) {
    AlarmsDB.getAlarmList(function am_gotAlarmList(list) {
      if (callback)
        callback(list);

    });
  },

  getAlarmById: function am_getAlarmById(id, callback) {
    AlarmsDB.getAlarm(id, function am_gotAlarm(alarm) {
      if (callback)
        callback(alarm);

    });
  },

  putAlarm: function am_putAlarm(alarm, callback) {
    AlarmsDB.putAlarm(alarm, function am_putAlarm(alarm) {
      if (callback)
        callback(alarm);

    });
  },

  updateAlarmStatusBar: function am_updateAlarmStatusBar() {
    if (!('mozSettings' in navigator))
      return;
    if (!navigator.mozAlarms)
      return;
    var request = navigator.mozAlarms.getAll();
    request.onsuccess = function(e) {
      var hasAlarmEnabled = !!e.target.result.length;
      navigator.mozSettings.createLock().set({'alarm.enabled':
          hasAlarmEnabled});
      ClockView.showHideAlarmSetIndicator(hasAlarmEnabled);
    };
    request.onerror = function(e) {
      console.log('get all alarm fail');
    };
  },

  regUpdateAlarmEnableState: function am_regUpdateAlarmEnableState(handler) {
    this._updateAlarmEableStateHandler = handler;
  }

};
