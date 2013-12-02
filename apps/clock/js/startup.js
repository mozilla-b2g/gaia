define('startup_init', function(require) {
'use strict';

var App = require('app');
var AlarmsDB = require('alarmsdb');
var Utils = require('utils');
var ClockView = require('clock_view');
var AlarmList = require('alarm_list');
var ActiveAlarm = require('active_alarm');
var mozL10n = require('l10n');
var testReq = require;

// eventually after some refactoring, this should be replaced with
// App.init.bind(App)
function initialize() {
  // after all the needed files have been loaded
  // and l10n has happened this will be called
  App.init();

  // all three of these should disappear as we refactor
  ClockView.init();
  AlarmList.init();
  ActiveAlarm.init();
}

// Run initialize after some tasks complete.
var barriers = Utils.async.namedParallel(['otaConvert', 'mozL10n'], initialize);

// We need to upgrade 1.0 and 1.1 alarms to 1.2 format.
AlarmsDB.convertAlarms(barriers.otaConvert);

// Support Firefox Desktop development with mozAlarms API mocking.
var needsMocks = !navigator.mozAlarms;
if (needsMocks) {
  testReq([
      '../test/unit/mocks/mock_moz_alarm.js'
    ], function(MockMozAlarms) {
    navigator.mozAlarms = new MockMozAlarms.MockMozAlarms(function() {});
    mozL10n.ready(barriers.mozL10n);
  });
} else {
  mozL10n.ready(barriers.mozL10n);
}

});

require(['require_config'], function() {
  requirejs(['startup_init']);
});
