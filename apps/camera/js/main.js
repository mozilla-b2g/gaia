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
var GeoLocation = require('lib/geo-location');
var settingsData = require('config/config');
var settings = new Settings(settingsData);
var Camera = require('lib/camera/camera');
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
  geolocation: new GeoLocation(),
  el: document.body,
  doc: document,
  win: window,
  perf: perf,

  camera: new Camera({
    focus: settingsData.focus
  }),

  controllers: {
    overlay: require('controllers/overlay'),
    battery: require('controllers/battery'),
    hud: require('controllers/hud'),
    controls: require('controllers/controls'),
    viewfinder: require('controllers/viewfinder'),
    settings: require('controllers/settings'),
    activity: require('controllers/activity'),
    camera: require('controllers/camera'),

    // Lazy loaded controllers
    lazy: [
      'controllers/zoom-bar',
      'controllers/indicators',
      'controllers/recording-timer',
      'controllers/preview-gallery',
      'controllers/storage',
      'controllers/confirm',
      'controllers/sounds',
      'controllers/countdown'
    ]
  }
});

// We start the camera loading straight
// away (async), as this is the slowest
// part of the boot process.
app.camera.load();
app.settings.fetch();
app.boot();

// Clean up
for (key in settingsData) {
  delete settingsData[key];
}

});
