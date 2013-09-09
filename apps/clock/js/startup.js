(function(exports) {
'use strict';

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

// separated into stages, stuff in stage 2 requires stuff in stage 1, etc...
var loadQueue = [
  [
    'shared/style/buttons.css',
    'shared/js/async_storage.js',
    'shared/js/template.js',
    'js/constants.js',
    'js/emitter.js',
    'js/utils.js'
  ],
  [
    'js/tabs.js',
    'js/view.js',
    'js/alarm.js',
    'js/active_alarm.js',
    'js/alarmsdb.js'
  ],
  [
    'js/panel.js',
    'js/clock_view.js',
    'js/alarm_list.js',
    'js/banner.js',
    'js/alarm_manager.js'
  ],
  [
    'js/stopwatch.js',
    'js/stopwatch_panel.js'
  ],
  [
    'js/app.js'
  ]
];

var needsMocks = !navigator.mozAlarms;

if (needsMocks) {
  loadQueue[0].push('test/unit/mocks/mock_mozAlarm.js');
}

function loadStage() {
  var stage = loadQueue.shift();
  // if there is more stuff to load, load it and call loadStage again
  if (stage) {
    LazyLoader.load(stage, loadStage);
  } else {
    // done loading, setup and initialize
    if (needsMocks) {
      navigator.mozAlarms = new MockMozAlarms(function() {});
    }
    navigator.mozL10n.ready(initialize);
  }
}

loadStage();
// end outer IIFE
}(this));
