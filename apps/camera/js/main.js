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
    var HudView = require('views/hud');
    var Filmstrip = require('filmstrip');
    var FocusRing = require('views/focusring');
    var ControlsView = require('views/controls');
    var ViewfinderView = require('views/viewfinder');
    var sounds = new Sounds(require('config/sounds'));
    var State = require('state');
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
      camera: require('controllers/camera')
    };

    debug('required dependencies');

    var views = {
      viewfinder: new ViewfinderView(),
      controls: new ControlsView(),
      focusRing: new FocusRing(),
      hud: new HudView()
    };

    debug('created views');

    var done = allDone();
    var camera = new Camera({
      maxFileSizeBytes: 0,
      maxWidth: 0,
      maxHeight: 0,
      container: document.body
    });

    /**
     * Create new `App`
     */

    var app = new App({
      win: window,
      doc: document,
      el: document.body,
      geolocation: new GeoLocation(),
      activity: new Activity(),
      state: new State(),
      camera: camera,
      sounds: sounds,
      views: views,
      controllers: controllers,
      filmstrip: Filmstrip,
      storage: new Storage()
    });

    debug('created app');

    // Check activity, configure the
    // camera with some of the activity
    // data, then boot the app.
    app.activity.check(done());
    app.state.fetch(done());

    done(function() {
      app.boot();
    });
  });

  require(['boot']);
});
