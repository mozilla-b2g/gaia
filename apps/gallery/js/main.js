'use strict';

// Store timestamp when JS started running
window.jsStarted = Date.now();

define(function(require) {

// Store performance timestamps
var perf = {
  jsStarted: window.jsStarted,
  firstModule: Date.now()
};

/**
 * Module Dependencies
 */

var App = require('app');

// Create new `App`
var app = window.app = new App({
  el: document.body,
  doc: document,
  win: window,
  perf: perf
});

setTimeout(function() {
  app.boot();
}, 12000);

});
