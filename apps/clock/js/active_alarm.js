define(function(require) {
  'use strict';

  var App = require('app');
  var AlarmManager = require('alarm_manager');
  var AlarmList = require('alarm_list');
  var AlarmsDB = require('alarmsdb');
  var Timer = require('timer');
  var Utils = require('utils');
  var View = require('view');

  function ActiveAlarm() {
    this.childWindow = null;
    this.initialized = false;
    this.ringerWaitList = [];
  }

  ActiveAlarm.singleton = Utils.singleton(ActiveAlarm);

  var messageHandlerMapping = {
    normal: 'onAlarm',
    snooze: 'onAlarm',
    timer: 'onTimer',
    ringer: 'onRingerReady',
    'close-alarm': 'onClose',
    'close-timer': 'onClose'
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
          var messageType = (typeof message.data === 'object' &&
                            typeof message.data.type === 'string') ?
            message.data.type : message.type;
          if (messageType && messageType in messageHandlerMapping) {
            var funcName = messageHandlerMapping[messageType];
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

    onRingerReady: function aac_ringerReady(msg, done) {
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

    onAlarm: function aac_onAlarm(message, done) {
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

    onTimer: function aac_onTimer(message, done) {
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

    onSnooze: function aac_onSnooze(message, done) {
      var id = message.data.id;
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

    onClose: function aac_onClose(message, done) {
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
