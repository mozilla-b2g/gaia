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
    var Camera = require('camera');
    var Sounds = require('sounds');
    var Config = require('lib/config');
    var Filmstrip = require('filmstrip');
    var Settings = require('lib/settings');
    var sounds = new Sounds(require('config/sounds'));
    var config = new Config(require('config/app'));
    var settings = new Settings(config.get());
    var allDone = require('utils/alldone');
    var GeoLocation = require('geolocation');
    var Activity = require('activity');
    var Storage = require('storage');
    var controllers = {
      hud: require('controllers/hud'),
      controls: require('controllers/controls'),
      viewfinder: require('controllers/viewfinder'),
      overlay: require('controllers/overlay'),
      confirm: require('controllers/confirm'),
      settings: require('controllers/settings'),
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
    var done = allDone();
    app.activity.check(done());
    app.settings.fetch(done());

    // ...boot!
    done(app.boot);
  });

  require(['boot']);
});
