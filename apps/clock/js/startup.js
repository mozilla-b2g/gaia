define('startup_init', function(require) {
'use strict';

var App = require('app');
var ClockView = require('clock_view');
var AlarmList = require('alarm_list');
var ActiveAlarm = require('active_alarm');
var mozL10n = require('l10n');

// eventually after some refactoring, this should be replaced with
// App.init.bind(App)
function initialize() {
  // after all the needed files have been loaded
  // and l10n has happened this will be called
  App.init();

  // all three of these should disappear as we refactor
  ClockView.init();
  AlarmList.init();
  ActiveAlarm.singleton().init();
}

mozL10n.ready(initialize);
});

require(['require_config'], function() {
  requirejs(['startup_init']);
});
