define('startup_init', function(require) {
'use strict';

var App = require('app');
var mozL10n = require('l10n');
var testReq = require;
var initialize = App.init.bind(App);

var needsMocks = !navigator.mozAlarms;
if (needsMocks) {
  testReq([
      '../test/unit/mocks/mock_moz_alarm.js'
    ], function(MockMozAlarms) {
    navigator.mozAlarms = new MockMozAlarms.MockMozAlarms(function() {});
    mozL10n.ready(initialize);
  });
} else {
  mozL10n.ready(initialize);
}

});

require(['require_config'], function() {
  requirejs(['startup_init']);
});
