/* global BaseModule, AlarmIcon, LazyLoader */
'use strict';

(function() {
  var AlarmMonitor = function() {};
  AlarmMonitor.SETTINGS = [
    'alarm.enabled'
  ];
  BaseModule.create(AlarmMonitor, {
    name: 'AlarmMonitor',
    _start: function() {
      LazyLoader.load(['js/alarm_icon.js']).then(function() {
        this.icon = new AlarmIcon(this);
        this.icon.start();
      }.bind(this)).catch(function(err) {
        console.error(err);
      });
    },
    '_observe_alarm.enabled': function(value) {
      this.enabled = value;
      this.icon && this.icon.update();
    }
  });
}());
