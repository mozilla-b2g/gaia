require(['config/require', 'config'], function() {
  'use strict';

  define('boot', function(require) {
    var debug = require('debug')('main');
    var timing = window.performance.timing;
    debug('domloaded in %s', (timing.domComplete - timing.domLoading) + 'ms');

    /**
     * Module Dependencies
     */

    var App = require('app');
    var Camera = require('lib/camera');
    var Sounds = require('lib/sounds');
    var Config = require('lib/config');
    var Settings = require('lib/settings');
    var sounds = new Sounds(require('config/sounds'));
    var config = new Config(require('config/app'));
    var settings = new Settings(config.get());
    var GeoLocation = require('lib/geo-location');
    var Activity = require('lib/activity');
    var Storage = require('lib/storage');
    var controllers = {
      hud: require('controllers/hud'),
      controls: require('controllers/controls'),
      viewfinder: require('controllers/viewfinder'),
      recordingTimer: require('controllers/recording-timer'),
      previewGallery: require('controllers/preview-gallery'),
      overlay: require('controllers/overlay'),
      confirm: require('controllers/confirm'),
      settings: require('controllers/settings'),
      activity: require('controllers/activity'),
      camera: require('controllers/camera'),
      sounds: require('controllers/sounds'),
      timer: require('controllers/timer'),
      zoomBar: require('controllers/zoom-bar'),
      indicators: require('controllers/indicators'),
      battery: require('controllers/battery')
    };

    // Attach navigator.mozL10n
    require('l10n');

    debug('required dependencies');

    var camera = new Camera({
      maxFileSizeBytes: 0,
      maxWidth: 0,
      maxHeight: 0,
      container: document.body
    });

    /**
     * Create new `App`
     */

    var app = window.app = new App({
      win: window,
      doc: document,
      el: document.body,
      geolocation: new GeoLocation(),
      activity: new Activity(),
      config: config,
      settings: settings,
      camera: camera,
      sounds: sounds,
      controllers: controllers,
      storage: new Storage()
    });

    debug('created app');

    // Fetch persistent settings
    app.settings.fetch();

    // Check for activities, then boot
    app.activity.check(app.boot);
  });

  require(['boot']);
});
