define(function(require, exports, module) {
/*jshint laxbreak:true*/
'use strict';

/**
 * Dependencies
 */

var performanceTesting = require('performanceTesting');
var constants = require('config/camera');
var bindAll = require('utils/bindAll');
var lockscreen = require('lockscreen');
var broadcast = require('broadcast');
var LazyL10n = require('LazyL10n');
var bind = require('utils/bind');
var evt = require('vendor/evt');
var dcf = require('dcf');

/**
 * Locals
 */

var LOCATION_PROMPT_DELAY = constants.PROMPT_DELAY;
var proto = evt.mix(App.prototype);
var unbind = bind.unbind;

/**
 * Exports
 */

module.exports = App;

/**
 * Initialize a new `App`
 *
 * Options:
 *
 *   - `root` The node to inject content into
 *
 * @param {Object} options
 * @constructor
 */
function App(options) {
  this.el = options.el;
  this.win = options.win;
  this.doc = options.doc;
  this.inSecureMode = this.win.parent !== this.win;
  this.geolocation = options.geolocation;
  this.activity = options.activity;
  this.filmstrip = options.filmstrip;
  this.camera = options.camera;
  this.sounds = options.sounds;
  this.views = options.views;
  this.controllers = options.controllers;

  // Bind context
  bindAll(this);
}

/**
 * Runs all the methods
 * to boot the app.
 *
 */
proto.boot = function() {
  this.filmstrip = this.filmstrip(this);
  this.runControllers();
  this.injectContent();
  this.bindEvents();
  this.miscStuff();
  this.geolocationWatch();
  this.emit('boot');
};

proto.teardown = function() {
  this.unbindEvents();
};

/**
 * Runs controllers to glue all
 * the parts of the app together.
 *
 */
proto.runControllers = function() {
  this.controllers.viewfinder(this);
  this.controllers.controls(this);
  this.controllers.confirm(this);
  this.controllers.overlay(this);
  this.controllers.camera(this);
  this.controllers.hud(this);
};

/**
 * Injects view DOM into
 * designated root node.
 *
 * @return {[type]} [description]
 */
proto.injectContent = function() {
  this.views.hud.appendTo(this.el);
  this.views.controls.appendTo(this.el);
  this.views.viewfinder.appendTo(this.el);
  this.views.focusRing.appendTo(this.el);
};

/**
 * Attaches event handlers.
 *
 */
proto.bindEvents = function() {
  bind(this.doc, 'visibilitychange', this.onVisibilityChange);
  bind(this.win, 'beforeunload', this.onBeforeUnload);
  this.on('focus', this.onFocus);
  this.on('blur', this.onBlur);
};

/**
 * Detaches event handlers.
 *
 */
proto.unbindEvents = function() {
  unbind(this.doc, 'visibilitychange', this.onVisibilityChange);
  unbind(this.win, 'beforeunload', this.onBeforeUnload);
  this.off('focus', this.onFocus);
  this.off('blur', this.onBlur);
};

/**
 * Tasks to run when the
 * app becomes visible.
 *
 */
proto.onFocus = function() {
  var ms = LOCATION_PROMPT_DELAY;
  setTimeout(this.geolocationWatch, ms);
};

/**
 * Tasks to run when the
 * app is minimised/hidden.
 *
 */
proto.onBlur = function() {
  this.geolocation.stopWatching();
  this.activity.cancel();
};

/**
 * Begins watching location
 * if not within a pending
 * activity and the app
 * isn't currently hidden.
 *
 */
proto.geolocationWatch = function() {
  var shouldWatch = !this.activity.active && !this.doc.hidden;
  if (shouldWatch) {
    this.geolocation.watch();
  }
};

/**
 * Responds to the `visibilitychange`
 * event, emitting useful app events
 * that allow us to perform relate
 * work elsewhere,
 *
 */
proto.onVisibilityChange = function() {
  if (this.doc.hidden) {
    this.emit('blur');
  } else {
    this.emit('focus');
  }
};

/**
 * Runs just before the
 * app is destroyed.
 *
 */
proto.onBeforeUnload = function() {
  this.views.viewfinder.setPreviewStream(null);
  this.emit('beforeunload');
};

/**
 * Miscalaneous tasks to be
 * run when the app first
 * starts.
 *
 * TODO: Eventually this function
 * will be removed, and all this
 * logic will sit in specific places.
 *
 */
proto.miscStuff = function() {
  var camera = this.camera;
  var focusTimeout;
  var self = this;

  // TODO: Should probably be
  // moved to a focusRing controller
  camera.state.on('change:focusState', function(value) {
    self.views.focusRing.setState(value);
    clearTimeout(focusTimeout);

    if (value === 'fail') {
      focusTimeout = setTimeout(function() {
        self.views.focusRing.setState(null);
      }, 1000);
    }
  });


  if (!navigator.mozCameras) {
    // TODO: Need to clarify what we
    // should do in this condition.
  }

  performanceTesting.dispatch('initialising-camera-preview');

  // Prevent the phone
  // from going to sleep.
  lockscreen.disableTimeout();

  // This must be tidied, but the
  // important thing is it's out
  // of camera.js
  LazyL10n.get(function() {
    dcf.init();
    performanceTesting.dispatch('startup-path-done');
  });

  // The screen wakelock should be on
  // at all times except when the
  // filmstrip preview is shown.
  broadcast.on('filmstripItemPreview', function() {
    lockscreen.enableTimeout();
  });

  // When the filmstrip preview is hidden
  // we can enable the  again.
  broadcast.on('filmstripPreviewHide', function() {
    lockscreen.disableTimeout();
  });
};

});
