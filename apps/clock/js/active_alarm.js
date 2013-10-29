define(function(require) {
'use strict';

var AlarmManager = require('alarm_manager');
var AlarmList = require('alarm_list');
var AlarmsDB = require('alarmsdb');
var Utils = require('utils');

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

  firedAlarm: null,
  message: null,
  childwindow: null,

  init: function am_init() {
    navigator.mozSetMessageHandler('alarm', this.handler.bind(this));
    AlarmManager.updateAlarmStatusBar();
  },

  handler: function aac_handler(message) {
    // Set a watchdog to avoid locking the CPU wake lock too long,
    // because it'd exhaust the battery quickly which is very bad.
    // This could probably happen if the app failed to launch or
    // handle the alarm message due to any unexpected reasons.
    Utils.safeCpuLock(30000, function(done) {
      // receive and parse the alarm id from the message
      var id = message.data.id;
      var type = message.data.type;

      // Unlock the CPU when these functions have been called
      var finalizer = Utils.async.namedParallel([
        'onReschedule',
        'onReceivedAlarm'
      ], function(err) {
        AlarmList.refresh();
        AlarmManager.updateAlarmStatusBar();
        done();
      });

      // If previous active alarm is showing,
      // turn it off and stop its notification
      if (this.childwindow !== null &&
        typeof this.childwindow !== 'undefined' &&
        !this.childwindow.closed) {
        if (this.childwindow.RingView) {
          this.childwindow.RingView.stopAlarmNotification();
        }
      }

      AlarmsDB.getAlarm(id, function aac_gotAlarm(err, alarm) {
        if (err) {
          done();
          return;
        }
        this.firedAlarm = alarm;
        if (type === 'normal') {
          alarm.schedule({
            type: 'normal',
            first: false
          }, alarm.saveCallback(finalizer.onReschedule));
        } else {
          alarm.cancel('snooze');
          alarm.save(finalizer.onReschedule);
        }
        // prepare to pop out attention screen, ring the ringtone, vibrate
        this.firedAlarm = alarm;
        this.message = message;
        var protocol = window.location.protocol;
        var host = window.location.host;
        this.childwindow =
          window.open(protocol + '//' + host + '/onring.html',
                      'ring_screen', 'attention');
        finalizer.onReceivedAlarm();
      }.bind(this));

    }.bind(this));
  },

  snoozeHandler: function aac_snoozeHandler() {
    Utils.safeCpuLock(30000, function(done) {
      var id = this.firedAlarm.id;
      AlarmsDB.getAlarm(id, function aac_gotAlarm(err, alarm) {
        if (err) {
          return;
        }
        alarm.schedule({
          type: 'snooze'
        }, alarm.saveCallback(function(err, alarm) {
          AlarmList.refreshItem(alarm);
          AlarmManager.updateAlarmStatusBar();
          done();
        }.bind(this)));
      });
    }.bind(this));
  }

};

return ActiveAlarm;
});
