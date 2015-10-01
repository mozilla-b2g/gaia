'use strict';

define('startup_init', function(require) {
  var App = require('app');
  App.init();
});

require(['require_config'], function() {
  requirejs(['startup_init']);
});
