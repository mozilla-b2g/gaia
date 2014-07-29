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

var Settings = require('lib/settings');
var settingsData = require('config/config');
var settings = new Settings(settingsData);
var App = require('app');

// Create globals specified in the config file
var key;
if (settingsData.globals) {
  for (key in settingsData.globals) {
    window[key] = settingsData.globals[key];
  }
}

// Create new `App`
var app = window.app = new App({
  settings: settings,
  el: document.body,
  doc: document,
  win: window,
  perf: perf
});

// We start the app loading straight
// away (async), as this is the slowest
// part of the boot process.
app.settings.fetch();
app.boot();

// Clean up
for (key in settingsData) {
  delete settingsData[key];
}

});
