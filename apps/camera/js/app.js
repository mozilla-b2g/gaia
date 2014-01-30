define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var performanceTesting = require('performanceTesting');
var ViewfinderView = require('views/viewfinder');
var ControlsView = require('views/controls');
var FocusRing = require('views/focusring');
var constants = require('config/camera');
var bindAll = require('utils/bindAll');
var lockscreen = require('lockscreen');
var storage = require('asyncStorage');
var broadcast = require('broadcast');
var Filmstrip = require('filmstrip');
var model = require('vendor/model');
var debug = require('debug')('app');
var LazyL10n = require('LazyL10n');
var HudView = require('views/hud');
var bind = require('utils/bind');
var dcf = require('dcf');

/**
 * Locals
 */

var LOCATION_PROMPT_DELAY = constants.PROMPT_DELAY;
var noop = function() {};
var unbind = bind.unbind;

// Mixin model methods
model(App.prototype);

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
  bindAll(this);
  this.views = {};
  this.el = options.el;
  this.win = options.win;
  this.doc = options.doc;
  this.inSecureMode = (this.win.location.hash === '#secure');
  this.controllers = options.controllers;
  this.geolocation = options.geolocation;
  this.filmstrip = options.filmstrip;
  this.activity = options.activity;
  this.config = options.config;
  this.storage = options.storage;
  this.camera = options.camera;
  this.sounds = options.sounds;
  this.reset(this.config.values());
  this.storageKey = 'camera_state';
  debug('initialized');
}

/**
 * Runs all the methods
 * to boot the app.
 *
 * @public
 */
App.prototype.boot = function() {
  this.setInitialMode();
  this.initializeViews();
  this.runControllers();
  this.injectViews();
  this.bindEvents();
  this.miscStuff();
  this.emit('boot');
  debug('booted');
};

App.prototype.setInitialMode = function() {
  var mode = this.activity.mode;
  if (mode) {
    this.set('mode', mode, { silent: true });
    console.log('set mode', mode);
  }
};

App.prototype.teardown = function() {
  this.unbindEvents();
};

/**
 * Runs controllers to glue all
 * the parts of the app together.
 *
 * @private
 */
App.prototype.runControllers = function() {
  debug('running controllers');
  this.filmstrip = this.filmstrip(this);
  this.controllers.camera(this);
  this.controllers.settings(this);
  this.controllers.viewfinder(this);
  this.controllers.controls(this);
  this.controllers.confirm(this);
  this.controllers.overlay(this);
  this.controllers.hud(this);
  debug('controllers run');
};

App.prototype.initializeViews = function() {
  this.views.controls = new ControlsView({ model: this });
  this.views.hud = new HudView({ model: this });
  this.views.viewfinder = new ViewfinderView();
  this.views.focusRing = new FocusRing();
  debug('views initialized');
};

App.prototype.injectViews = function() {
  this.views.hud.appendTo(this.el);
  this.views.controls.appendTo(this.el);
  this.views.viewfinder.appendTo(this.el);
  this.views.focusRing.appendTo(this.el);
  debug('views injected');
};

/**
 * Attaches event handlers.
 *
 */
App.prototype.bindEvents = function() {
  this.camera.once('configured', this.storage.check);
  this.storage.once('checked:healthy', this.geolocationWatch);
  bind(this.doc, 'visibilitychange', this.onVisibilityChange);
  bind(this.win, 'beforeunload', this.onBeforeUnload);
  bind(this.el, 'click', this.onClick);
  this.on('change', this.onStateChange);
  this.on('focus', this.onFocus);
  this.on('blur', this.onBlur);
  debug('events bound');
};

/**
 * Detaches event handlers.
 */
App.prototype.unbindEvents = function() {
  unbind(this.doc, 'visibilitychange', this.onVisibilityChange);
  unbind(this.win, 'beforeunload', this.onBeforeUnload);
  this.off('focus', this.onFocus);
  this.off('blur', this.onBlur);
  debug('events unbound');
};

/**
 * Tasks to run when the
 * app becomes visible.
 *
 * Check the storage again as users
 * may have made changes since the
 * app was minimised
 */
App.prototype.onFocus = function() {
  var ms = LOCATION_PROMPT_DELAY;
  setTimeout(this.geolocationWatch, ms);
  this.storage.check();
  debug('focus');
};

/**
 * Tasks to run when the
 * app is minimised/hidden.
 */
App.prototype.onBlur = function() {
  this.geolocation.stopWatching();
  this.activity.cancel();
  debug('blur');
};

App.prototype.onClick = function() {
  debug('click');
  this.emit('settingsdismiss');
};

/**
 * Begins watching location
 * if not within a pending
 * activity and the app
 * isn't currently hidden.
 *
 */
App.prototype.geolocationWatch = function() {
  var shouldWatch = !this.activity.active && !this.doc.hidden;
  if (shouldWatch) {
    this.geolocation.watch();
    debug('geolocation watched');
  }
};

/**
 * Responds to the `visibilitychange`
 * event, emitting useful app events
 * that allow us to perform relate
 * work elsewhere.
 *
 * @private
 */
App.prototype.onVisibilityChange = function() {
  if (this.doc.hidden) { this.emit('blur'); }
  else { this.emit('focus'); }
};

/**
 * Runs just before the
 * app is destroyed.
 *
 * @private
 */
App.prototype.onBeforeUnload = function() {
  this.views.viewfinder.setPreviewStream(null);
  this.emit('beforeunload');
  debug('beforeunload');
};

/**
 * Fetch the state object
 * held in storage and merge
 * with existing state model.
 *
 * @param  {Function} done
 */
App.prototype.fetchState = function(done) {
  var self = this;
  storage.getItem(this.storageKey, function(props) {
    self.set(props, { silent: true });
    debug('fetched', props);
    if (done) done();
  });
};

/**
 * Persist the model to storage.
 *
 * Excluding keys marked as,
 * `persist: false` in config json.
 *
 * @param  {Function} done
 * @return {App} for chaining
 */
App.prototype.saveState = function(done) {
  var data = this.getPersistentState();
  storage.setItem(this.storageKey, data, done || noop);
  debug('saving');
  return this;
};

/**
 * Toggles an app state through
 * its `options` defined in the
 * config.json.
 *
 * @param  {String} key
 */
App.prototype.toggle = function(key) {
  var options = this.options(key);
  var current = this.get(key);
  var index = options.indexOf(current);
  var newIndex = (index + 1) % options.length;
  var newValue = options[newIndex];
  this.set(key, newValue);
  debug('%s key toggled to \'%s\'', key, newValue);
};

App.prototype.toggler = function(key) {
  return (function() { this.toggle(key); }).bind(this);
};

// Maybe not-required...
App.prototype.options = function(key) {
  return this.config.options(key);
};

/**
 * Returns an filtered version of
 * the application state object,
 * containing only keys that should
 * be persisted to storage.
 *
 * @return {Object}
 */
App.prototype.getPersistentState = function() {
  var keys = this.config.persistent();
  var self = this;
  var result = {};
  keys.forEach(function(key) { result[key] = self.get(key); });
  debug('got persistent keys', result);
  return result;
};

/**
 * Saves state model to persist
 * storage. Debounced by 2secs.
 *
 * @private
 */
App.prototype.onStateChange = function(keys) {
  var persistent = this.config.persistent();
  var isPersistent = function(key) { return !!~persistent.indexOf(key); };
  var filtered = keys.filter(isPersistent);
  if (filtered.length) {
    clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(this.saveState, 2000);
    debug('%d persistent keys changed', filtered.length);
  }
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
App.prototype.miscStuff = function() {
  var camera = this.camera;
  var focusTimeout;
  var self = this;

  // TODO: Should probably be
  // moved to a focusRing controller
  camera.on('change:focus', function(value) {
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

  debug('misc stuff done');
};

});
