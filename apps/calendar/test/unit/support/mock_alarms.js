define(function(require, exports) {
'use strict';

var _id = 0;
var alarms = [];
var mozAlarms;

exports.setup = function() {
  mozAlarms = navigator.mozAlarms;
  navigator.mozAlarms = exports;
};

exports.teardown = function() {
  removeAll();
  navigator.mozAlarms = mozAlarms;
};

exports.add = function(date, honorTimezone, data) {
  var alarmId = _id++;
  alarms.push({
    alarmId: alarmId,
    date: date,
    honorTimezone: honorTimezone,
    data: data
  });

  return resolve(alarmId);
};

exports.getAll = function() {
  return resolve(alarms);
};

exports.remove = function(alarmId) {
  alarms = alarms.filter(alarm => alarm.alarmId !== alarmId);
};

function removeAll() {
  alarms = [];
}

function resolve(result) {
  var request = { onsuccess: null, onerror: null };
  var requestContext = {};
  requestContext.result = result;
  setTimeout(() => {
    return request.onsuccess &&
           request.onsuccess.call(requestContext, result);
  }, 10);

  return request;
}

});
