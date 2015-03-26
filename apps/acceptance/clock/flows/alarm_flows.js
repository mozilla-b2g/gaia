'use strict';
var Alarm = require('../regions/alarm');
//var AlarmFlows = require('../flows/alarm_flows');

function AlarmFlows(client) {
    Alarm.call(this, client);
}

AlarmFlows.prototype = {
    setNewAlarm: function(name, hour, minute, timeOfDay, sound, repeat, vibrate, snooze) {
    }
}

module.exports = AlarmFlows;