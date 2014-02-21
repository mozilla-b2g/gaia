'use strict';

define('startup_init', function(require) {

var App = require('app');
var mozL10n = require('l10n');
mozL10n.ready(App.init.bind(App));
});

require(['require_config'], function() {
  requirejs(['startup_init']);
});
