define(function(require, exports) {
  'use strict';

  var Utils = require('utils');

  exports.alarms = new Map();
  exports.idCount = 0;

  exports.getAlarmList = function(callback) {
      var collect = [];
      for (var k of this.alarms) {
        collect.push(k[0]);
      }
      setTimeout(function() {
        callback(null, collect);
      }, 0);
  };

  exports.putAlarm = function(alarm, callback) {
      if (!alarm.id) {
        alarm = new (require('alarm'))(Utils.extend(
          alarm.toSerializable(),
          { id: this.idCount++ }
        ));
      } else {
        alarm = new (require('alarm'))(alarm.toSerializable());
      }
      this.alarms.set(alarm.id, alarm);
      setTimeout(function() {
        callback(null, alarm);
      }, 0);
  };

  exports.getAlarm = function(key, callback) {
      if (this.alarms.has(key)) {
        setTimeout(function() {
          callback(null, this.alarms.get(key));
        }.bind(this), 0);
      } else {
        setTimeout(function() {
          callback(new Error('key not found ' + key));
        }.bind(this), 0);
      }
  };

  exports.deleteAlarm = function(key, callback) {
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

  };
});
