define(function(require, exports, module) {

  'use strict';

  var AlarmsDB = require('alarmsdb');
  var Utils = require('utils');
  var constants = require('constants');
  var mozL10n = require('l10n');

  // define WeakMaps for protected properties
  var protectedProperties = (function() {
    var protectedWeakMaps = new Map();
    ['id', 'repeat', 'registeredAlarms'].forEach(function(x) {
      protectedWeakMaps.set(x, new WeakMap());
    });
    return protectedWeakMaps;
  })();

  // define variables
  var validPropertiesSet = null; // memoizes validProperties() method
  var idMap = protectedProperties.get('id');
  var repeatMap = protectedProperties.get('repeat');
  var registeredAlarmsMap = protectedProperties.get('registeredAlarms');

  // ---------------------------------------------------------
  // Alarm Object

  function Alarm(config) {
    if (config instanceof Alarm) {
      config = config.toSerializable();
    }
    var econfig = Utils.extend(this.defaultProperties(), config || {});
    this.extractProtected(econfig);
    Utils.extend(this, econfig);
  }

  Alarm.prototype = {

    constructor: Alarm,

    // ---------------------------------------------------------
    // Initialization methods

    extractProtected: function(config) {
      var valids = this.validProperties();
      for (var i in config) {
        if (protectedProperties.has(i)) {
          var map = protectedProperties.get(i);
          map.set(this, config[i]);
          delete config[i];
        }
        if (!valids.has(i)) {
          delete config[i];
        }
      }
    },

    defaultProperties: function() {
      var now = new Date();
      return {
        registeredAlarms: {}, // set -> this.schedule & this.cancel
        repeat: {},
        hour: now.getHours(),
        minute: now.getMinutes(),

        // Raw Fields
        label: '',
        sound: 'ac_classic_clock_alarm.opus',
        vibrate: 1,
        snooze: 5,
        color: 'Darkorange'
      };
    },

    validProperties: function() {
      if (validPropertiesSet !== null) {
        return new Set(validPropertiesSet);
      }
      var ret = new Set();
      var keys = Object.keys(this.defaultProperties());
      keys = keys.concat(['id']);
      for (var i in keys) {
        ret.add(keys[i]);
      }
      validPropertiesSet = ret;
      return new Set(ret);
    },

    // ---------------------------------------------------------
    // Persisted form

    toSerializable: function alarm_toSerializable() {
      var retval = {};
      for (var i in this) {
        if (this.hasOwnProperty(i)) {
          retval[i] = this[i];
        }
      }
      for (var kv of protectedProperties) {
        var prop = kv[0], map = kv[1];
        if (map.has(this) && map.get(this) !== undefined) {
          retval[prop] = map.get(this);
        }
      }
      return retval;
    },

    // ---------------------------------------------------------
    // Getters and Setters

    set time(x) {
      // destructure passed array
      this.minute = +x[1];
      this.hour = +x[0];
    },

    get time() {
      return [this.hour, this.minute];
    },

    get id() {
      return idMap.get(this) || undefined;
    },

    get registeredAlarms() {
      return registeredAlarmsMap.get(this) || {};
    },

    set repeat(x) {
      var rep = {};
      for (var y of constants.DAYS) {
        if (x[y] === true) {
          rep[y] = true;
        }
      }
      repeatMap.set(this, rep);
    },

    get repeat() {
      return repeatMap.get(this);
    },

    set enabled(x) {
      throw 'use setEnabled to set (async requires callback)';
    },

    get enabled() {
      for (var i in this.registeredAlarms) {
        if (i === 'normal') {
          return true;
        }
      }
      return false;
    },

    // ---------------------------------------------------------
    // Time Handling

    summarizeDaysOfWeek: function alarm_summarizeRepeat() {
      var _ = mozL10n.get;
      // Build a bitset
      var value = 0;
      for (var i = 0; i < constants.DAYS.length; i++) {
        var dayName = constants.DAYS[i];
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
        for (var i = 0; i < constants.DAYS.length; i++) {
          var dayName = constants.DAYS[i];
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
           (this.hour === now.getHours() &&
            this.minute > now.getMinutes())) {
        return false;
      }
      return true;
    },

    isDateInRepeat: function alarm_isDateInRepeat(date) {
      // return true if repeat contains date
      var day = constants.DAYS[(date.getDay() + 6) % 7];
      return !!this.repeat[day];
    },

    repeatDays: function alarm_repeatDays() {
      var count = 0;
      for (var i in this.repeat) {
        if (this.repeat[i]) {
          count++;
        }
      }
      return count;
    },

    isRepeating: function alarm_isRepeating() {
      return this.repeatDays() !== 0;
    },

    getNextAlarmFireTime: function alarm_getNextAlarmFireTime() {
      var now = new Date(), nextFire = new Date();
      nextFire.setHours(this.hour, this.minute, 0, 0);
      while (nextFire <= now ||
              !(this.repeatDays() === 0 ||
                this.isDateInRepeat(nextFire))) {
        nextFire.setDate(nextFire.getDate() + 1);
      }
      return nextFire;
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
        var scheduleWithID = function(err, alarm) {
          this.schedule({
            type: 'normal',
            first: true
          }, this.saveCallback(callback));
        };
        if (!this.id) {
          // if we don't have an ID yet, save to IndexedDB to
          // get one, and then call scheduleWithID
          this.save(scheduleWithID.bind(this));
        } else {
          // otherwise, just call scheduleWithID
          setTimeout(scheduleWithID.bind(this, null, this), 0);
        }
      } else if (this.enabled) {
        this.cancel();
        this.save(callback);
      } else if (callback) {
        setTimeout(callback.bind(undefined, null, this), 0);
      }
    },

    delete: function alarm_delete(callback) {
      this.cancel();
      AlarmsDB.deleteAlarm(this.id,
        function alarm_innerDelete(err, alarm) {
        callback(err, this);
      }.bind(this));
    },

    // ---------------------------------------------------------
    // Database Integration

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
        idMap.set(this, alarm.id);
        callback && callback(err, this);
      }.bind(this));
    },

    // ---------------------------------------------------------
    // Alarm API

    scheduleHelper: function alarm_scheduleHelper(type, date, callback) {
      var data = {
        id: this.id,
        type: type
      };
      var request = navigator.mozAlarms.add(
        date, 'ignoreTimezone', data);
      request.onsuccess = (function(ev) {
        var registeredAlarms = registeredAlarmsMap.get(this) || {};
        registeredAlarms[type] = ev.target.result;
        registeredAlarmsMap.set(this, registeredAlarms);
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

    schedule: function alarm_schedule(options, callback) {
      /*
       * Schedule
       *
       * Schedule a mozAlarm to wake up the app at a certain time.
       *
       * @options {Object} an object containing parameters for the
       *                   scheduled alarm.
       *          - type: 'normal' or 'snooze'
       *          - first: {boolean}
       *
       * First is used true when an alarm is "first" in a sequence
       * of repeating normal alarms.
       * For no-repeat alarms, the sequence of length 1, and so
       * the alarm is always first.
       * Snooze alarms are never first, since they have a normal
       * alarm parent.
       *
       */
      options = options || {}; // defaults
      if (typeof options.type === 'undefined') {
        options.type = 'normal';
      }
      if (typeof options.first === 'undefined') {
        options.first = true;
      }
      if (!options.first && !this.isRepeating()) {
        this.cancel('normal');
        callback(null, this);
        return;
      }
      this.cancel(options.type);
      if (options.type === 'normal') {
        var firedate = this.getNextAlarmFireTime();
      } else if (options.type === 'snooze') {
        var firedate = this.getNextSnoozeFireTime();
      }
      this.scheduleHelper(options.type, firedate, callback);
    },

    cancel: function alarm_cancel(cancelType) {
      // cancel an alarm type ('normal' or 'snooze')
      // type == false to cancel all
      function removeAlarm(type, id) {
        navigator.mozAlarms.remove(id);
        var registeredAlarms = this.registeredAlarms;
        delete registeredAlarms[type];
        registeredAlarmsMap.set(this, registeredAlarms);
      }
      if (!cancelType) {
        for (var type in this.registeredAlarms) {
          removeAlarm.call(this, type, this.registeredAlarms[type]);
        }
      } else {
        removeAlarm.call(this, cancelType, this.registeredAlarms[cancelType]);
      }
    }

  };

  // ---------------------------------------------------------
  // Export

  module.exports = Alarm;

});
