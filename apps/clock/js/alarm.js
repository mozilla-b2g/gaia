(function(exports) {

  'use strict';

  // ---------------------------------------------------------
  // Constants

  var DAYS = ['monday', 'tuesday', 'wednesday',
              'thursday', 'friday', 'saturday',
              'sunday'];

  var RDAYS = DAYS.map(function(_, n) {
    return n;
  });

  var WEEKDAYS = [0, 1, 2, 3, 4].map(function(x) {
    return DAYS[x];
  });

  var WEEKENDS = [5, 6].map(function(x) {
    return DAYS[x];
  });

  // ---------------------------------------------------------
  // Alarm Object

  function Alarm(config) {
    this.init(config || {});
  }

  Alarm.prototype = {

    // ---------------------------------------------------------
    // Constant Objects

    _days: DAYS,
    _rdays: RDAYS,
    _weekdays: WEEKDAYS,
    _weekends: WEEKENDS,

    _default: function() {
      var now = new Date();
      return {
        // Use accessors for these
        id: '', // do not change
        osAlarms: {}, // set -> this.schedule & this.cancel
        repeat: {}, // set -> this.setRepeat
        hour: now.getHours(), // use -> this.setTime
        minute: now.getMinutes(), // use -> this.setTime
        enabled: true, // -> this.setEnabled

        // Raw Fields
        label: '',
        sound: 'ac_classic_clock_alarm.opus',
        vibrate: 1,
        snooze: 5,
        color: 'Darkorange'
      };
    },

    // ---------------------------------------------------------
    // Object Setup

    init: function alarm_init(config) {
      var el, defaultObject = this._default();
      // set defaulted properties
      Utils.extend(this, this._default(), config);
      // normalize data
      this.setRepeat(this.repeat);
    },

    // ---------------------------------------------------------
    // Getters and Setters

    setTime: function alarm_setTime(hour, minute) {
      // destructure passed array
      if (hour && !minute && hour instanceof Array) {
        minute = hour[1];
        hour = hour[0];
      }
      this.hour = hour;
      this.minute = minute;
    },

    getTime: function alarm_getTime() {
      return [this.hour, this.minute];
    },

    setRepeat: function alarm_setRepeat(days) {
      var repeat = {};
      if ((days.constructor === String) && (days.length === 7)) {
        // Support legacy "1111100" style repeat representation
        // Todo: remove
        for (var i = 0; i < days.length; i++) {
          var dayName = this._days[i];
          // repeat[{dayName}] = true/false
          if (days[i] === '1') {
            repeat[dayName] = true;
          }
        }
      } else {
        // Expect an object like {monday:true,saturday:true}
        for (var i = 0; i < this._days.length; i++) {
          var dayName = this._days[i];
          if (days.hasOwnProperty(dayName)) {
            repeat[dayName] = days[dayName];
          }
        }
      }
      this.repeat = repeat;
    },

    getRepeat: function alarm_getRepeat() {
      return this.repeat;
    },

    // ---------------------------------------------------------
    // Time Handling

    summarizeDaysOfWeek: function alarm_summarizeRepeat() {
      var _ = navigator.mozL10n.get;
      // Build a bitset
      var value = 0;
      for (var i = 0; i < this._days.length; i++) {
        var dayName = this._days[i];
        if (this.repeat[dayName] === true) {
          value |= (1 << i);
        }
      }
      var summary;
      if (value === 127) { // 127 = 0b1111111
        summary = _('everyday');
      } else if (value === 31) { // 31 = 0b0011111
        summary = _('weekdays');
      } else if (value === 96) { // 96 = 0b1100000
        summary = _('weekends');
      } else if (value !== 0) { // any day was true
        var weekdays = [];
        for (var i = 0; i < this._days.length; i++) {
          var dayName = this._days[i];
          if (this.repeat[dayName]) {
            // Note: here, Monday is the first day of the week
            // whereas in JS Date(), it's Sunday -- hence the (+1) here.
            weekdays.push(_('weekday-' + ((i + 1) % 7) + '-short'));
          }
          summary = weekdays.join(', ');
        }
      } else { // no day was true
        summary = _('never');
      }
      return summary;
    },

    isAlarmPassedToday: function alarm_isAlarmPassedToday() {
      var now = new Date();
      if (this.hour > now.getHours() ||
           (this.hour == now.getHours() &&
            this.minute > now.getMinutes())) {
        return false;
      }
      return true;
    },

    _dateInRepeat: function alarm_dateInRepeat(date, repeat) {
      // return true if repeat contains date
      var day = this._days[(date.getDay() + 6) % 7];
      return repeat[day];
    },

    _emptyRepeat: function alarm_emptyRepeat() {
      for (var i in this.repeat) {
        if (this.repeat[i]) {
          return false;
        }
      }
      return true;
    },

    getNextAlarmFireTime: function alarm_getNextAlarmFireTime() {
      var now = new Date(), alarm = new Date();
      alarm.setHours(this.hour, this.minute, 0, 0);
      while (alarm < now ||
              !(this._emptyRepeat() ||
                this._dateInRepeat(alarm, this.repeat))) {
        alarm.setDate(alarm.getDate() + 1);
      }
      return alarm;
    },

    getNextSnoozeFireTime: function alarm_getNextSnoozeFireTime() {
      if (this.snooze && (typeof this.snooze) === 'number') {
        var now = new Date();
        now.setMinutes(now.getMinutes() + this.snooze);
        return now;
      }
      return null;
    },

    // ---------------------------------------------------------
    // Wholistic methods (Alarm API and Database)

    setEnabled: function alarm_setEnabled(value, callback) {
      if (value) {
        this.enabled = true;
        this.schedule(true, this.saveCallback(callback));
      } else if (!value && this.enabled) {
        this.enabled = false;
        this.cancel();
        this.save(callback);
      } else if (callback) {
        callback(null, this);
      }
    },

    deleteAlarm: function alarm_deleteAlarm(callback) {
      this.cancel();
      AlarmsDB.deleteAlarm(this.id,
        function alarm_innerDeleteAlarm(err, alarm) {
        callback(err, this);
      }.bind(this));
    },

    // ---------------------------------------------------------
    // Database Integration

    refresh: function alarm_refresh(callback) {
      AlarmsDB.getAlarm(this.id, function(err, alarmObj) {
        if (!err) {
          Utils.extend(this, alarmObj);
        }
        callback && callback(err, this);
      }.bind(this));
    },

    saveCallback: function alarm_saveCallback(callback) {
      return function(err, value) {
        if (!err) {
          this.save(callback);
        } else {
          if (callback) {
            callback(err, value);
          }
        }
      }.bind(this);
    },

    save: function alarm_save(callback) {
      AlarmsDB.putAlarm(this, function(err, alarm) {
        callback && callback(err, this);
      }.bind(this));
    },

    // ---------------------------------------------------------
    // Alarm API

    _scheduleHelper: function alarm_scheduleHelper(type, date, callback) {
      var data = {
        id: this.id,
        type: type
      };
      var request = navigator.mozAlarms.add(
        date, 'ignoreTimezone', data);
      request.onsuccess = (function(ev) {
        var result = ev.target.result;
        this.osAlarms[type] = result;
        if (callback) {
          callback(null, this);
        }
      }).bind(this);
      request.onerror = function(ev) {
        if (callback) {
          callback(ev.target.error);
        }
      };
    },

    schedule: function alarm_schedule(firstTime, callback) {
      // Schedule the alarm
      if (!firstTime && (!this.enabled || this._emptyRepeat())) {
        this.enabled = false;
        this.cancel('normal');
        callback(null, this);
        return;
      }
      this.cancel('normal');
      this._scheduleHelper('normal', this.getNextAlarmFireTime(), callback);
    },

    scheduleSnooze: function alarm_scheduleSnooze(callback) {
      this.cancel('snooze');
      this._scheduleHelper('snooze', this.getNextSnoozeFireTime(), callback);
    },

    cancel: function alarm_cancel(cancelType) {
      // cancel an alarm type ('normal' or 'snooze')
      // type == false to cancel all
      function removeAlarm(type, id) {
        navigator.mozAlarms.remove(id);
        delete this.osAlarms[type];
      }
      if (!cancelType) {
        for (var type in this.osAlarms) {
          removeAlarm.call(this, type, this.osAlarms[type]);
        }
      } else {
        removeAlarm.call(this, cancelType, this.osAlarms[cancelType]);
      }
    }

  };

  // ---------------------------------------------------------
  // Export

  exports.Alarm = Alarm;

})(this);
