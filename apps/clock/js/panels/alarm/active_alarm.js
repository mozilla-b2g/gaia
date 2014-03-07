define(function(require) {
  'use strict';

  var App = require('app');
  var AlarmManager = require('alarm_manager');
  var AlarmList = require('panels/alarm/alarm_list');
  var AlarmsDB = require('alarmsdb');
  var Timer = require('timer');
  var Utils = require('utils');

  function ActiveAlarm() {
    this.childWindow = null;
    this.initialized = false;
    this.ringerWaitList = [];
  }

  ActiveAlarm.singleton = Utils.singleton(ActiveAlarm);

  var messageHandlerMapping = {
    normal: 'onAlarm',
    snooze: 'onAlarm',
    scheduleSnooze: 'scheduleSnooze',
    timer: 'onTimer',
    ringer: 'onRingerReady',
    'close-alarm': 'onClose',
    'close-timer': 'onClose'
  };

  ActiveAlarm.prototype = {
    constructor: ActiveAlarm,

    init: function am_init() {
      if (!this.initialized) {
        var handler = this.handler.bind(this);
        navigator.mozSetMessageHandler('alarm', handler);
        // Add a handler to make integration tests easier:
        window.addEventListener('test-alarm', handler);
        navigator.mozSetMessageHandler('message', handler);
        window.addEventListener('message', handler, false);
        AlarmManager.updateAlarmStatusBar();
        this.initialized = true;
      }
    },

    handler: function aac_handler(message) {
      // If this is a 'test-alarm' CustomEvent, data is stored in 'detail'.
      var data = message.data || message.detail;
      data.date = message.date || new Date();

      // Set a watchdog to avoid locking the CPU wake lock too long,
      // because it'd exhaust the battery quickly which is very bad.
      // This could probably happen if the app failed to launch or
      // handle the alarm message due to any unexpected reasons.
      Utils.safeWakeLock({timeoutMs: 30000}, function(done) {
        try {
          this[messageHandlerMapping[data.type]].call(
            this, data, done);
        } catch (err) {
          console.error('Error calling handler', err);
          done();
          throw err;
        }
      }.bind(this));
    },

    onRingerReady: function aac_ringerReady(data, done) {
      if (data.status === 'READY') {
        while (true) {
          var el = this.ringerWaitList.shift();
          if (!el) {
            break;
          }
          if (typeof el === 'function') {
            el();
          }
        }
      }
      done();
    },

    popAlert: function aac_popAlert(callback) {
      if (this.childwindow && !this.childwindow.closed) {
        this.childwindow.postMessage({
          type: 'stop'
        }, window.location.origin);
        this.ringerWaitList.push(callback.bind(null, this.childwindow));
      } else {
        // prepare to pop out attention screen, ring the ringtone, vibrate
        var childwindow = this.childwindow = window.open(
          window.location.origin + '/onring.html', '_blank', 'attention');
        this.ringerWaitList.push(callback.bind(null, childwindow));
      }
    },

    onAlarm: function aac_onAlarm(data, done) {
      /*
       * We maintain an alarm's life cycle immediately when the alarm goes off.
       * If user click the snooze button when the alarm goes off,
       * we request a snooze alarm with snoozeAlarmId immediately.
       *
       * If multiple alarms goes off in a period of time (even if in the same
       * time), we always stop the previous notification and handle it by
       * its setting. Such as following case:
       *   An once alarm should be turned off.
       *   A repeat alarm should be requested its next alarm.
       *   A snooze alarm should be turned off.
       */
      // receive and parse the alarm id from the message
      var id = data.id;
      var date = data.date;
      var type = data.type;

      // Unlock the CPU when these functions have been called
      var finalizer = Utils.async.namedParallel([
        'onReschedule',
        'onReceivedAlarm'
      ], function(err) {
        AlarmList.refresh();
        AlarmManager.updateAlarmStatusBar();
        done();
      });

      AlarmsDB.getAlarm(id, function aac_gotAlarm(err, alarm) {
        if (err) {
          done();
          return;
        }
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
        this.popAlert(function(childWindow) {
          childWindow.postMessage({
            type: 'alarm',
            date: date,
            alarm: alarm.toSerializable()
          }, window.location.origin);
        });
        finalizer.onReceivedAlarm();
      }.bind(this));
    },

    onTimer: function aac_onTimer(data, done) {
      Timer.request(function(err, timer) {
        if (err && !timer) {
          timer = Timer.singleton().toSerializable();
        }
        this.popAlert(function(childWindow) {
          childWindow.postMessage({
            type: 'timer',
            timer: timer
          }, window.location.origin);
          done();
        }.bind(this));
      }.bind(this));
    },

    scheduleSnooze: function aac_scheduleSnooze(data, done) {
      var id = data.id;
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
        }));
      });
    },

    onClose: function aac_onClose(data, done) {
      this.childwindow = null;
      switch (data.type) {
        case 'close-timer':
          Timer.singleton(function(err, timer) {
            if (!err) {
              timer.cancel();
              timer.save();
            }
            App.navigate({ hash: '#timer-panel' }, done);
          });
          break;
        case 'close-alarm':
          App.navigate({ hash: '#alarm-panel' }, done);
          break;
      }
    }
  };

  return ActiveAlarm;
});
