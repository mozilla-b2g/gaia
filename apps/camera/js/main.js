define(function(require) {
'use strict';

var timing = window.performance.timing;
var domLoaded = timing.domComplete - timing.domLoading;
var debug = require('debug')('main');
debug('domloaded in %s', domLoaded + 'ms');

/**
 * Module Dependencies
 */

var Activity = require('lib/activity');
var Settings = require('lib/settings');
var GeoLocation = require('lib/geo-location');
var settings = new Settings(require('config/settings'));
var Camera = require('lib/camera');
var App = require('app');

/**
 * Create new `App`
 */

var app = window.app = new App({
  settings: settings,
  geolocation: new GeoLocation(),
  activity: new Activity(),

  el: document.body,
  doc: document,
  win: window,

  camera: new Camera({
    maxFileSizeBytes: 0,
    maxWidth: 0,
    maxHeight: 0,
    cacheConfig: true,
    cafEnabled: settings.caf.enabled()
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
    timer: require('controllers/timer'),
    zoomBar: require('controllers/zoom-bar'),
    indicators: require('controllers/indicators'),

    // Lazy loaded
    previewGallery: 'controllers/preview-gallery',
    storage: 'controllers/storage',
    confirm: 'controllers/confirm',
    battery: 'controllers/battery',
    sounds: 'controllers/sounds'
  }
});

// Fetch persistent settings,
// Check for activities, then boot
app.settings.fetch();
app.activity.check(app.boot);

});