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

  _onFireAlarm: null,
  _onFireChildWindow: null,

  init: function am_init() {
    var self = this;
    navigator.mozSetMessageHandler('alarm', function gotMessage(message) {
      self.onAlarmFiredHandler(message);
    });
    AlarmManager.updateAlarmStatusBar();
  },

  onAlarmFiredHandler: function aac_onAlarmFiredHandler(message) {
    Utils.safeCpuLock(15000, function(doneCb) {
      // receive and parse the alarm id from the message
      var id = message.data.id;
      var type = message.data.type;

      // Unlock the CPU when these functions have been called
      var finalizer = Utils.asyncNamedParallel([
        'alarmRescheduleCb',
        'onFireChildWindowCb'
      ], function(err, value) {
        AlarmList.refresh();
        AlarmManager.updateAlarmStatusBar();
        doneCb();
      });

      // If previous active alarm is showing,
      // turn it off and stop its notification
      if (this._onFireChildWindow !== null &&
        typeof this._onFireChildWindow !== 'undefined' &&
        !this._onFireChildWindow.closed) {
        if (this._onFireChildWindow.RingView) {
          this._onFireChildWindow.RingView.stopAlarmNotification();
        }
      }

      AlarmsDB.getAlarm(id, function aac_gotAlarm(err, alarm) {
        if (err) {
          doneCb();
          return;
        }
        this._onFireAlarm = alarm;
        if (type === 'normal') {
          alarm.schedule(false,
            alarm.saveCallback(finalizer.alarmRescheduleCb));
        } else {
          finalizer.alarmRescheduleCb();
        }
        // prepare to pop out attention screen, ring the ringtone, vibrate
        this._onFireAlarm = alarm;
        var protocol = window.location.protocol;
        var host = window.location.host;
        this._onFireChildWindow =
          window.open(protocol + '//' + host + '/onring.html',
                      'ring_screen', 'attention');
        this._onFireChildWindow.onload = function childWindowLoaded() {
          finalizer.onFireChildWindowCb();
        };
      }.bind(this));

    }.bind(this));
  },

  snoozeHandler: function aac_snoozeHandler() {
    Utils.safeCpuLock(15000, function(doneCb) {
      var id = this._onFireAlarm.id;
      AlarmsDB.getAlarm(id, function aac_gotAlarm(err, alarm) {
        if (!err) {
          alarm.scheduleSnooze(alarm.saveCallback(function(err, alarm) {
            AlarmManager.updateAlarmStatusBar();
            doneCb();
          }.bind(this)));
        }
      });
    }.bind(this));
  },

  getOnFireAlarm: function aac_getOnFireAlarm() {
    return this._onFireAlarm;
  }

};
