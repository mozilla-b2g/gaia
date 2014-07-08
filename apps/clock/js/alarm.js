define(function(require, exports, module) {
  'use strict';

  var DAYS_STARTING_SUNDAY = require('constants').DAYS_STARTING_SUNDAY;

  /**
   * Alarm represents one alarm instance. It tracks any mozAlarms it
   * has registered, its IndexedDB ID, and any other properties
   * relating to the alarm's schedule and firing options.
   */
  function Alarm(opts) {
    opts = opts || {};
    var now = new Date();
    var defaults = {
      id: null,
      registeredAlarms: {}, // keys: ('normal' or 'snooze') => mozAlarmID
      repeat: {}, // Map like { "monday": true, "tuesday": false, ... }
      hour: now.getHours(),
      minute: now.getMinutes(),
      label: '',
      sound: 'ac_classic_clock_alarm.opus',
      vibrate: true,
      snooze: 5 // Number of minutes to snooze
    };

    for (var key in defaults) {
      this[key] = (key in opts ? opts[key] : defaults[key]);
    }
  }

  Alarm.prototype = {
    toJSON: function() {
      return {
        id: this.id,
        registeredAlarms: this.registeredAlarms,
        repeat: this.repeat,
        hour: this.hour,
        minute: this.minute,
        label: this.label,
        sound: this.sound,
        vibrate: this.vibrate,
        snooze: this.snooze
      };
    },

    /**
     * An alarm is enabled if and only if it has a registeredAlarm set
     * with a type of 'normal'. To disable an alarm, any
     * registeredAlarms are unregistered with mozAlarms and removed
     * from this.registeredAlarms.
     */
    isEnabled: function() {
      for (var i in this.registeredAlarms) {
        if (i === 'normal') {
          return true;
        }
      }
      return false;
    },

    isRepeating: function() {
      for (var key in this.repeat) {
        if (this.repeat[key]) {
          return true;
        }
      }
      return false;
    },

    getNextAlarmFireTime: function(relativeTo) {
      var now = relativeTo || new Date();
      var nextFire = new Date(now.getTime());
      nextFire.setHours(this.hour, this.minute, 0, 0);

      while (nextFire <= now ||
             (this.isRepeating() &&
              !this.repeat[DAYS_STARTING_SUNDAY[nextFire.getDay()]])) {
        nextFire.setDate(nextFire.getDate() + 1);
      }
      return nextFire;
    },

    getNextSnoozeFireTime: function(relativeTo) {
      var now = relativeTo || new Date();
      return new Date(now.getTime() + this.snooze * 60 * 1000);
    },

    /**
     * Schedule an alarm to ring in the future.
     *
     * @return {Promise}
     * @param {'normal'|'snooze'} type
     */
    schedule: function(type) {
      var alarmDatabase = require('alarm_database'); // circular dependency

      var firedate;
      if (type === 'normal') {
        this.cancel(); // Cancel both snooze and regular mozAlarms.
        firedate = this.getNextAlarmFireTime();
      } else if (type === 'snooze') {
        this.cancel('snooze'); // Cancel any snooze mozAlarms.
        firedate = this.getNextSnoozeFireTime();
      } else {
        return Promise.reject('Invalid type for Alarm.schedule().');
      }

      // Save the alarm to the database first. This ensures we have a
      // valid ID, and that we've saved any modified properties before
      // attempting to schedule the alarm.
      return alarmDatabase.put(this).then(() => {
        return new Promise((resolve, reject) => {
          // Then, schedule the alarm.
          var req = navigator.mozAlarms.add(firedate, 'ignoreTimezone',
                                            { id: this.id, type: type });
          req.onerror = reject;
          req.onsuccess = (evt) => {
            this.registeredAlarms[type] = evt.target.result;
            resolve();
          };
        });
        // After scheduling the alarm, this.registeredAlarms has
        // changed, so we must save that too.
      }).then(() => alarmDatabase.put(this))
        .then(() => {
          this._notifyChanged();
        }).catch((e) => {
          console.log('Alarm scheduling error: ' + e.toString());
          throw e;
        });
    },

    /**
     * Cancel an alarm. If `type` is provided, cancel only that type
     * ('normal' or 'snooze').
     */
    cancel: function(/* optional */ type) {
      var types = (type ? [type] : Object.keys(this.registeredAlarms));
      types.forEach((type) => {
        var id = this.registeredAlarms[type];
        navigator.mozAlarms.remove(id);
        delete this.registeredAlarms[type];
      });
      this._notifyChanged();
    },

    _notifyChanged: function(removed) {
      // Only update the application if this alarm was actually saved
      // (i.e. it has an ID).
      if (this.id) {
        window.dispatchEvent(
          new CustomEvent(removed ? 'alarm-removed' : 'alarm-changed', {
            detail: { alarm: this }
          })
        );
      }
    },

    /**
     * Delete an alarm completely from the database, canceling any
     * pending scheduled mozAlarms.
     */
    delete: function() {
      var alarmDatabase = require('alarm_database'); // circular dependency
      this.cancel();
      return alarmDatabase.delete(this.id).then(() => {
        this._notifyChanged(/* removed = */ true);
      });
    }

  };


  module.exports = Alarm;

});
