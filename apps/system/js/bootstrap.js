/* global App */
/* jshint nonew: false */
'use strict';

window.addEventListener('load', function startup() {
  var app = new App();
  window.app = app;
  app.start();
});