'use strict';

var mozAlarmsId = 0;

function MockOSAlarm(date, respectTimezone, data, callback) {
  this.date = date || new Date();
  this.data = data || {};
  this.callback = callback;
  this.id = mozAlarmsId++;
  this.respectTimezone = respectTimezone;
  this.timeout = setTimeout(function() {
    if ((typeof this.callback) === 'function') {
      this.callback({
        id: this.id,
        respectTimezone: this.respectTimezone,
        date: this.date,
        data: this.data
      });
    }
  }.bind(this), this.date.getTime() - Date.now());
}

function MockMozAlarmRequest(config) {
  this.init(config || {});
}

MockMozAlarmRequest.prototype = {

  init: function mar_init(config) {
    setTimeout(function() {
      this.fire(config.error, config.result);
    }.bind(this), 0);
  },

  fire: function mar_call(error, result) {
    if (!error) {
      this.onsuccess && this.onsuccess({
        target: {
          result: result
        }
      });
    } else {
      this.onerror && this.onerror({
        target: {
          error: result
        }
      });
    }
  }

};

var messageHandlers = [];
navigator.mozSetMessageHandler = function(type, callback) {
  if (type === 'alarm') {
    messageHandlers.push(callback);
  }
};

navigator.mozAlarms = {
  alarms: [],

  getAll: function() {
    return new MockMozAlarmRequest({
      result: this.alarms
    });
  },

  add: function(date, timezone, data) {
    if (!(timezone === 'ignoreTimezone' ||
          timezone === 'honorTimezone')) {
      throw new Error('invalid timezone argument');
    }
    var alarm = new MockOSAlarm(date, timezone, data, function(x) {
      messageHandlers.forEach(function(callback) {
        callback(x);
      });
      this.remove(x.id);
    }.bind(this));
    this.alarms.push(alarm);
    return new MockMozAlarmRequest({
      result: alarm.id
    });
  },

  remove: function(id) {
    for (var i = 0; i < this.alarms.length; i++) {
      var alarm = this.alarms[i];
      if (alarm && (alarm.id === id)) {
        clearTimeout(alarm.timeout);
        this.alarms.splice(i, 1);
        return true;
      }
    }
    return false;
  }
};

