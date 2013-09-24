requirejs.config({
  baseUrl: 'js',
  paths: {
    template: '../shared/js/template',
    'gesture-detector': '../shared/js/gesture_detector',
    async_storage: '../shared/js/async_storage',
    shared: '../shared'
  },
  shim: {
    template: {
      exports: 'Template'
    },
    emitter: {
      exports: 'Emitter'
    },
    'gesture-detector': {
      exports: 'GestureDetector'
    },
    async_storage: {
      exports: 'asyncStorage'
    }
  }
});

define('startup', function(require) {
'use strict';

require('css');
var App = require('app');
var ClockView = require('clock_view');
var AlarmList = require('alarm_list');
var ActiveAlarm = require('active_alarm');

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

require([
  'css!shared/style/switches',
  'css!shared/style/input_areas',
  'css!shared/style/buttons',
  'css!shared/style/edit_mode'
  ], function() {
     var needsMocks = !navigator.mozAlarms;
     if (needsMocks) {
       require([
           '../test/unit/mocks/mock_mozAlarm.js'
         ], function(MockMozAlarms) {
         navigator.mozAlarms = new MockMozAlarms.MockMozAlarms(function() {});
         navigator.mozL10n.ready(initialize);
       });
     } else {
       navigator.mozL10n.ready(initialize);
     }
  }
);

});

requirejs(['startup']);
