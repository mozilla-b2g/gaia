(function(exports) {
  'use strict';

  function MockAlarmsDB() {
    this.init();
  }

  MockAlarmsDB.prototype = {

    init: function() {
      this.alarms = new Map();
      this.idCount = 0;
    },

    getAlarmList: function(callback) {
      var collect = [];
      for (var k of this.alarms) {
        collect.push(k[0]);
      }
      setTimeout(function() {
        callback(null, collect);
      }, 0);
    },

    putAlarm: function(alarm, callback) {
      if (!alarm.id) {
        alarm = new Alarm(Utils.extend(
          alarm.toSerializable(),
          { id: this.idCount++ }
        ));
      } else {
        alarm = new Alarm(alarm.toSerializable());
      }
      this.alarms.set(alarm.id, alarm);
      setTimeout(function() {
        callback(null, alarm);
      }, 0);
    },

    getAlarm: function(key, callback) {
      if (this.alarms.has(key)) {
        setTimeout(function() {
          callback(null, this.alarms.get(key));
        }.bind(this), 0);
      } else {
        setTimeout(function() {
          callback(new Error('key not found ' + key));
        }.bind(this), 0);
      }
    },

    deleteAlarm: function(key, callback) {
      if (this.alarms.has(key)) {
        var value = this.alarms.get(key);
        this.alarms.delete(key);
        setTimeout(function() {
          callback(null, value);
        }, 0);
      } else {
        setTimeout(function() {
          callback(new Error('key not found ' + key));
        }, 0);
      }

    }

  };

  exports.MockAlarmsDB = MockAlarmsDB;

})(this);
