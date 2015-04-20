'use strict';
var Alarm = require('../regions/alarm');


function AlarmFlows(client) {
    Alarm.call(this, client);
}

AlarmFlows.prototype = Object.create(Alarm.prototype);
AlarmFlows.prototype.constructor = AlarmFlows;

AlarmFlows.prototype.setNewAlarm = function(alarmInfo) {
    Alarm.prototype.createNewAlarm.call(this, alarmInfo);
};

module.exports = AlarmFlows;