define(function(require) {
'use strict';

/**
 * Module Dependencies
 */

var Settings = require('lib/settings');
var GeoLocation = require('lib/geo-location');
var settingsData = require('config/config');
var settings = new Settings(settingsData);
var Camera = require('lib/camera/camera');
var Pinch = require('lib/pinch');
var App = require('app');

// Log dom-loaded to keep perf on our radar
var timing = window.performance.timing;
var domLoaded = timing.domComplete - timing.domLoading;
console.log('domloaded in %s', domLoaded + 'ms');

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
  Pinch: Pinch,

  el: document.body,
  doc: document,
  win: window,

  camera: new Camera({
    focus: settingsData.focus
  }),

  controllers: {
    overlay: require('controllers/overlay'),
    battery: require('controllers/battery'),
    hud: require('controllers/hud'),
    controls: require('controllers/controls'),
    viewfinder: require('controllers/viewfinder'),
    recordingTimer: require('controllers/recording-timer'),
    settings: require('controllers/settings'),
    activity: require('controllers/activity'),
    camera: require('controllers/camera'),
    zoomBar: require('controllers/zoom-bar'),
    indicators: require('controllers/indicators'),

    // Lazy loaded
    previewGallery: 'controllers/preview-gallery',
    storage: 'controllers/storage',
    confirm: 'controllers/confirm',
    sounds: 'controllers/sounds',
    timer: 'controllers/timer'
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
