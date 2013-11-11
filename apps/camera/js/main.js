require(['config/require', 'config'], function() {
  'use strict';

  define('boot', function(require) {

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
    var ConfirmView = require('views/confirm');
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

    var views = {
      viewfinder: new ViewfinderView(),
      controls: new ControlsView(),
      focusRing: new FocusRing(),
      hud: new HudView()
    };

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

    // Check activity, then boot
    app.activity.check(app.boot);
  });

  require(['boot']);
});
