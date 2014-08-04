define(function(require) {
  'use strict';

  var App = require('app');
  var alarmDatabase = require('alarm_database');
  var Timer = require('timer');
  var Utils = require('utils');
  var ChildWindowManager = require('./child_window_manager');
  var PostMessageProxy = require('./post_message_proxy');

  /**
   * ActiveAlarm handles the system event that fires when an alarm
   * goes off. This includes opening an attention window and updating
   * an alarm's schedule when the user taps 'snooze'. The interaction
   * is mediated through a PostMessageProxy (as `this.ringView`),
   * which makes it trivial to interact with a JavaScript object
   * hosted in another window.
   */
  function ActiveAlarm() {
    this.alertWindow = new ChildWindowManager(
      window.location.origin + '/onring.html');

    // Handle the system's alarm event.
    navigator.mozSetMessageHandler('alarm', this.onMozAlarm.bind(this));
    window.addEventListener('test-alarm', this.onMozAlarm.bind(this));

    // Handle events transparently from the child window.
    PostMessageProxy.receive('activeAlarm', this);
    this.ringView = PostMessageProxy.create(null, 'ringView');
  }

  ActiveAlarm.prototype = {

    /**
     * Fired when the system triggers an alarm. We acquire a wake lock
     * here to ensure that the system doesn't fall asleep before we
     * have a chance to present the attention alert window.
     */
    onMozAlarm: function(message) {
      var data = message.data || message.detail;
      data.date = message.date || new Date();

      Utils.safeWakeLock({ timeoutMs: 30000 }, (done) => {
        switch (data.type) {
        case 'normal':
        case 'snooze':
          this.onAlarmFired(data, done);
          break;
        case 'timer':
          this.onTimerFired(data, done);
          break;
        }
      });
    },

    /**
     * Add `alert` to the attention screen. The child alert window
     * expects to receive any number of alert messages; if the child
     * window has not been presented yet, this function opens the
     * window before passing along the alert.
     *
     * An Alert object (which can represent a timer or an alarm)
     * adheres to the following structure:
     *
     * @param {Alert} alert An alert to pass to the child window.
     * @param {string} alert.type 'alarm' or 'timer'
     * @param {string} [alert.label] Optional label
     * @param {string} [alert.sound] Optional filename of a sound to play
     * @param {boolean} alert.vibrate True if the alarm should vibrate
     * @param {Date} alert.time The time the alert was supposed to fire
     * @param {string} [alert.id] The ID of the alert, if type === 'alarm'
     */
    popAlert: function(alert) {
      this.alertWindow.whenReady(() => {
        this.ringView.window = this.alertWindow.childWindow;
        this.ringView.addAlert(alert);
      });
    },

    /**
     * Handle an alarm firing. Immediately reschedule the alarm for
     * its next firing interval (if the alarm was a repeat alarm).
     *
     * @param {object} message The message as retrieved by mozAlarm
     * @param {function} done Callback to release the wake lock.
     */
    onAlarmFired: function(data, done) {
      var id = data.id;
      var date = data.date;
      var type = data.type;

      alarmDatabase.get(id).then((alarm) => {
        this.popAlert({
          type: 'alarm',
          label: alarm.label,
          sound: alarm.sound,
          vibrate: alarm.vibrate,
          time: date,
          id: alarm.id
        });

        if (type === 'normal') {
          // The alarm instance doesn't yet know that a mozAlarm has
          // fired, so we call .cancel() to wipe this mozAlarm ID from
          // alarm.registeredAlarms().
          alarm.cancel();

          if (alarm.isRepeating()) {
            alarm.schedule('normal').then(done);
          } else {
            done();
          }
        } else {
          done();
        }
      });
    },

    /**
     * Handle a timer firing.
     *
     * @param {object} message The message as retrieved by mozAlarm
     * @param {function} done Callback to release the wake lock.
     */
    onTimerFired: function(data, done) {
      Timer.getFromStorage((timer) => {
        this.popAlert({
          type: 'timer',
          label: timer.label,
          sound: timer.sound,
          vibrate: timer.vibrate,
          time: new Date(timer.startTime + timer.duration)
        });
        done();
      });
    },

    /**
     * Snooze the given alarm.
     *
     * @param {string} alarmId The ID of the alarm.
     */
    snoozeAlarm: function(alarmId) {
      alarmDatabase.get(alarmId).then((alarm) => {
        alarm.schedule('snooze');
      });
    },

    /**
     * Close the current alert window.
     *
     * @param {string} type 'alarm' or 'timer'
     * @param {string} alarmId The ID of the alarm, if type === 'alarm'
     */
    close: function(type, alarmId) {
      this.alertWindow.close();
      if (type === 'timer') {
        App.navigate({ hash: '#timer-panel' });
        Timer.singleton(function(err, timer) {
          if (!err) {
            timer.cancel();
            timer.save();
          }
        });
      } else if (type === 'alarm') {
        App.navigate({ hash: '#alarm-panel' });
      }
    }
  };

  return ActiveAlarm;
});
