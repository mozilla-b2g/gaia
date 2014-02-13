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
    var Filmstrip = require('lib/filmstrip');
    var sounds = new Sounds(require('config/sounds'));
    var config = new Config(require('config/app'));
    var settings = new Settings(config.get());
    var GeoLocation = require('lib/geo-location');
    var Activity = require('lib/activity');
    var allDone = require('lib/all-done');
    var Storage = require('lib/storage');
    var controllers = {
      hud: require('controllers/hud'),
      controls: require('controllers/controls'),
      viewfinder: require('controllers/viewfinder'),
      overlay: require('controllers/overlay'),
      confirm: require('controllers/confirm'),
      settings: require('controllers/settings'),
      activity: require('controllers/activity'),
      camera: require('controllers/camera'),
      sounds: require('controllers/sounds')
    };

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
      filmstrip: Filmstrip,
      storage: new Storage()
    });

    debug('created app');

    // Async jobs to be
    // done before boot...
    var done = allDone()(app.boot);
    app.activity.check(done());
    app.settings.fetch(done());
  });

  require(['boot']);
});
