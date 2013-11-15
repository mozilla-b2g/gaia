define('active_alarm', function(require) {
  'use strict';

  var App = require('app');
  var AlarmManager = require('alarm_manager');
  var AlarmList = require('alarm_list');
  var AlarmsDB = require('alarmsdb');
  var Timer = require('timer');
  var Utils = require('utils');
  var View = require('view');

  function ActiveAlarm(opts = {}) {
    this.firedAlarm = null;
    this.message = null;
    this.childWindow = null;
    this.initialized = false;
    this.ringerWaitList = [];
  }

  ActiveAlarm.singleton = Utils.singleton(ActiveAlarm);

  var MessageTypes = {
    alarm: ['normal', 'snooze'],
    timer: ['timer'],
    ringer: ['ringer'],
    close: ['close-alarm', 'close-timer']
  };

  ActiveAlarm.prototype = {
    constructor: ActiveAlarm,

    init: function am_init() {
      if (!this.initialized) {
        navigator.mozSetMessageHandler('alarm', this.handler.bind(this));
        navigator.mozSetMessageHandler('message', this.handler.bind(this));
        window.addEventListener('message', this.handler.bind(this), false);
        AlarmManager.updateAlarmStatusBar();
        this.initialized = true;
      }
    },

    handler: function aac_handler(message) {
      // Set a watchdog to avoid locking the CPU wake lock too long,
      // because it'd exhaust the battery quickly which is very bad.
      // This could probably happen if the app failed to launch or
      // handle the alarm message due to any unexpected reasons.
      var success = false;
      Utils.safeWakeLock({timeoutMs: 30000}, function(done) {
        if (typeof message !== 'undefined') {
          var type = Utils.data.find(['data.type', 'type'],
            Utils.safe.bind(null, message));
          if (type) {
            var funcName;
            for (var at in MessageTypes) {
              if (typeof this[at] === 'function') {
                MessageTypes[at].some(function(x) {
                  if (x === type.result) {
                    funcName = at;
                    return true;
                  }
                });
              }
            }
            if (funcName) {
              this[funcName].call(this, message, done);
              success = true;
            }
          }
        }
        if (!success) {
          done();
        }
      }.bind(this));
    },

    ringer: function aac_ringer(msg, done) {
      if (msg.data.status === 'READY') {
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
        var protocol = window.location.protocol;
        var host = window.location.host;
        var childwindow = this.childwindow = window.open(
          window.location.origin + '/onring.html', '_blank', 'attention');
        this.ringerWaitList.push(callback.bind(null, childwindow));
      }
    },

    alarm: function aac_alarm(message, done) {
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
      var id = message.data.id;
      var date = message.date;
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

    timer: function aac_timer(message, done) {
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

    snooze: function aac_snooze(message, done) {
      Utils.safeWakeLock({timeoutMs: 30000}, function(done) {
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
    },

    close: function aac_close(message, done) {
      this.childwindow = null;
      switch (message.data.type) {
        case 'close-timer':
          App.navigate('#timer-panel');
          View.instance(document.querySelector('#timer-panel'),
            Timer.Panel).dialog();
          Timer.singleton(function(err, timer) {
            if (!err) {
              timer.cancel();
              timer.save(done);
            }
          });
          break;
        case 'close-alarm':
          App.navigate('#alarm-panel');
          done();
          break;
      }
    }
  };

  return ActiveAlarm;
});
