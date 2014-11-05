define(function(require) {
'use strict';

var Panel = require('panel');
var ClockView = require('panels/alarm/clock_view');
var AlarmListPanel = require('panels/alarm/alarm_list');
var ActiveAlarm = require('panels/alarm/active_alarm');
var html = require('text!panels/alarm/panel.html');

function AlarmPanel() {
  Panel.apply(this, arguments);

  this.element.innerHTML = html;
  ClockView.init();
  this.alarmListPanel = new AlarmListPanel(document.getElementById('alarms'));
  this.activeAlarm = new ActiveAlarm();
}

AlarmPanel.prototype = Object.create(Panel.prototype);

return AlarmPanel;
});
