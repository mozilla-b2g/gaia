var ActiveAlarm = {
/*
 * We maintain an alarm's life cycle immediately when the alarm goes off.
 * If user click the snooze button when the alarm goes off,
 * we request a snooze alarm with snoozeAlarmId immediately.
 *
 * If multiple alarms goes off in a period of time(even if in the same time),
 * we always stop the previous notification and handle it by its setting.
 * Such as following case:
 *   An once alarm should be turned off.
 *   A repeat alarm should be requested its next alarm.
 *   A snooze alarm should be turned off.
 */

  _onFireAlarm: {},
  _onFireChildWindow: null,

  init: function am_init() {
    var self = this;
    navigator.mozSetMessageHandler('alarm', function gotMessage(message) {
      self.onAlarmFiredHandler(message);
    });
    AlarmManager.updateAlarmStatusBar();
  },

  onAlarmFiredHandler: function aac_onAlarmFiredHandler(message) {
    // We have to ensure the CPU doesn't sleep during the process of
    // handling alarm message, so that it can be handled on time.
    var cpuWakeLock = navigator.requestWakeLock('cpu');

    // Set a watchdog to avoid locking the CPU wake lock too long,
    // because it'd exhaust the battery quickly which is very bad.
    // This could probably happen if the app failed to launch or
    // handle the alarm message due to any unexpected reasons.
    var unlockCpuWakeLock = function unlockCpuWakeLock() {
      if (cpuWakeLock) {
        cpuWakeLock.unlock();
        cpuWakeLock = null;
      }
    };
    setTimeout(unlockCpuWakeLock, 30000);

    // receive and parse the alarm id from the message
    var id = message.data.id;
    var type = message.data.type;
    // clear the requested id of went off alarm to DB
    var clearAlarmRequestId = function clearAlarmRequestId(alarm, callback) {
      if (type === 'normal') {
        alarm.normalAlarmId = '';
      } else {
        alarm.snoozeAlarmId = '';
      }

      AlarmManager.putAlarm(alarm, function aac_putAlarm(alarmFromDB) {
        // Set the next repeat alarm when nornal alarm goes off.
        if (type === 'normal' &&
            !Utils.isEmptyRepeat(alarmFromDB.repeat) &&
            callback) {
          alarmFromDB.enabled = false;
          callback(alarmFromDB);
        } else {
          // Except repeat alarm, the active alarm should be turned off.
          if (!alarmFromDB.normalAlarmId)
            AlarmList.toggleAlarmEnableState(false, alarmFromDB);
        }
      });
    };

    // set the next repeat alarm
    var setRepeatAlarm = function setRepeatAlarm(alarm) {
      AlarmList.toggleAlarmEnableState(true, alarm);
    };

    // use the alarm id to query db
    // find out which alarm is being fired.
    var self = this;
    AlarmManager.getAlarmById(id, function aac_gotAlarm(alarm) {
      if (!alarm) {
        unlockCpuWakeLock();
        return;
      }
      // clear the requested id of went off alarm to DB
      clearAlarmRequestId(alarm, setRepeatAlarm);

      // If previous active alarm is showing,
      // turn it off and stop its notification
      if (self._onFireChildWindow !== null &&
        typeof self._onFireChildWindow !== 'undefined' &&
        !self._onFireChildWindow.closed) {
          if (self._onFireChildWindow.RingView) {
            self._onFireChildWindow.RingView.stopAlarmNotification();
          }
        }

      // prepare to pop out attention screen, ring the ringtone, vibrate
      self._onFireAlarm = alarm;
      var protocol = window.location.protocol;
      var host = window.location.host;
      self._onFireChildWindow =
        window.open(protocol + '//' + host + '/onring.html',
                    'ring_screen', 'attention');
      self._onFireChildWindow.onload = function childWindowLoaded() {
        unlockCpuWakeLock();
      };

    });
    AlarmManager.updateAlarmStatusBar();
  },

  snoozeHandler: function aac_snoozeHandler() {
    var id = this._onFireAlarm.id;
    AlarmManager.getAlarmById(id, function aac_gotAlarm(alarm) {
      alarm.enabled = true;
      AlarmManager.putAlarm(alarm, function aac_putAlarm(alarm) {
        AlarmManager.set(alarm, true);  // set a snooze alarm
      });
    });
  },

  getOnFireAlarm: function aac_getOnFireAlarm() {
    return this._onFireAlarm;
  }

};
