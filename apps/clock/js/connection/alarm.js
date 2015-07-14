define(function(require, exports) {
'use strict';

var Alarm = require('alarm');
var parseTime = require('ext/parse_loose_time');

exports.onmessage = function(event, port) {
  if (event.type !== 'create') {
    port.postMessage({
      error: `Error: Invalid gaia_alarm message type "${event.type}"`
    });
    return;
  }

  var time = event.data.time;
  var timeObject = typeof time === 'object' ? time : parseTime(time);

  if (!isValidTime(timeObject)) {
    port.postMessage({
      error: `Invalid alarm time "${time}"`
    });
    return;
  }

  var alarm = new Alarm(timeObject);
  alarm.schedule('normal').then(() => {
    window.dispatchEvent(new CustomEvent('alarm-changed', {
      detail: { alarm: alarm, showBanner: false }
    }));
    port.postMessage({
      hour: timeObject.hour,
      minute: timeObject.minute,
      time: alarm.getNextAlarmFireTime().getTime()
    });
  }).catch(err => {
    port.postMessage({
      error: `${err.message} ${err.stack}`
    });
  });
};

function isValidTime(time) {
  // time can be "null" and "typeof null === 'object'"
  return time && typeof time === 'object' && 'hour' in time &&
    time.hour >= 0 && time.hour <= 24 && 'minute' in time &&
    time.minute >= 0 && time.minute <= 59;
}

});
