define('startup_init', function(require) {
'use strict';

console.log('--> define startup_init..');
var App = require('app');
var ClockView = require('clock_view');
var AlarmList = require('alarm_list');
console.log('--> define ActiveAlarm to be "active_alarm"..');
var ActiveAlarm = require('active_alarm');
var mozL10n = require('l10n');
var testReq = require;

// eventually after some refactoring, this should be replaced with
// App.init.bind(App)
function initialize() {
  // after all the needed files have been loaded
  // and l10n has happened this will be called
  console.log('--> initialize(): App.init()..');
  App.init();

  // all three of these should disappear as we refactor
  console.log('--> initialize(): ClockView.init()..');
  ClockView.init();
  console.log('--> initialize(): AlarmList.init()..');
  AlarmList.init();
  console.log('--> initialize(): ActiveAlarm.init()..');
  ActiveAlarm.init();
  console.log('--> initialize(): ActiveAlarm.init() done..');
}

var needsMocks = !navigator.mozAlarms;
if (needsMocks) {
  testReq([
      '../test/unit/mocks/mock_moz_alarm.js'
    ], function(MockMozAlarms) {
    navigator.mozAlarms = new MockMozAlarms.MockMozAlarms(function() {});
    mozL10n.ready(initialize);
  });
} else {
  console.log('--> startup.js initialize..');
  mozL10n.ready(initialize);
}

});

require(['require_config'], function() {
  requirejs(['startup_init']);
});
