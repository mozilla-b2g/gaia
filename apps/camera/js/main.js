define(function(require) {
'use strict';

var timing = window.performance.timing;
var domLoaded = timing.domComplete - timing.domLoading;
console.log('domloaded in %s', domLoaded + 'ms');

/**
 * Module Dependencies
 */

var Settings = require('lib/settings');
var GeoLocation = require('lib/geo-location');
var settingsData = require('config/config');
var settings = new Settings(settingsData);
var Camera = require('lib/camera/camera');
var App = require('app');

/**
  * Create globals specified in the config file
  */
if (settingsData.globals) {
  for (var key in settingsData.globals) {
    window[key] = settingsData.globals[key];
  }
}

/**
 * Create new `App`
 */
var app = window.app = new App({
  settings: settings,
  geolocation: new GeoLocation(),

  el: document.body,
  doc: document,
  win: window,

  camera: new Camera({
    focus: settingsData.focus
  }),

  controllers: {
    hud: require('controllers/hud'),
    controls: require('controllers/controls'),
    viewfinder: require('controllers/viewfinder'),
    recordingTimer: require('controllers/recording-timer'),
    overlay: require('controllers/overlay'),
    settings: require('controllers/settings'),
    activity: require('controllers/activity'),
    camera: require('controllers/camera'),
    zoomBar: require('controllers/zoom-bar'),
    indicators: require('controllers/indicators'),

    // Lazy loaded
    previewGallery: 'controllers/preview-gallery',
    storage: 'controllers/storage',
    confirm: 'controllers/confirm',
    battery: 'controllers/battery',
    sounds: 'controllers/sounds',
    timer: 'controllers/timer',
  }
});

// Fetch persistent settings,
// Check for activities, then boot
app.camera.load();
app.settings.fetch();
app.boot();

});