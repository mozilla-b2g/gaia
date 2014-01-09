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
    var GeoLocation = require('geolocation');
    var Activity = require('activity');
    var controllers = {
      hud: require('controllers/hud'),
      controls: require('controllers/controls'),
      viewfinder: require('controllers/viewfinder'),
      overlay: require('controllers/overlay'),
      confirm: require('controllers/confirm'),
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

    /**
     * Create new `App`
     */

    var app = new App({
      win: window,
      doc: document,
      el: document.body,
      geolocation: new GeoLocation(),
      activity: new Activity(),
      camera: new Camera(),
      sounds: sounds,
      views: views,
      controllers: controllers,
      filmstrip: Filmstrip
    });

    debug('created app');

    // Check activity, then boot
    app.activity.check(app.boot);
  });

  require(['boot']);
});
