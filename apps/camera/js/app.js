define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var NotificationView = require('views/notification');
var ViewfinderView = require('views/viewfinder');
var orientation = require('lib/orientation');
var ControlsView = require('views/controls');
var FocusRing = require('views/focus-ring');
var ZoomBarView = require('views/zoom-bar');
var bindAll = require('lib/bind-all');
var model = require('vendor/model');
var debug = require('debug')('app');
var HudView = require('views/hud');
var bind = require('lib/bind');

/**
 * Locals
 */

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
  debug('initialize');
  bindAll(this);
  this.views = {};
  this.el = options.el;
  this.win = options.win;
  this.doc = options.doc;
  this.require = options.require || window.requirejs;
  this.inSecureMode = (this.win.location.hash === '#secure');
  this.controllers = options.controllers;
  this.geolocation = options.geolocation;
  this.activity = options.activity;
  this.settings = options.settings;
  this.camera = options.camera;
  debug('initialized');
}

/**
 * Runs all the methods
 * to boot the app.
 *
 * @public
 */
App.prototype.boot = function() {
  debug('boot');
  if (this.didBoot) { return; }
  this.bindEvents();
  this.initializeViews();
  this.runControllers();
  this.injectViews();
  this.didBoot = true;
  debug('booted');
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
  debug('run controllers');
  this.controllers.settings(this);
  this.controllers.activity(this);
  this.controllers.timer(this);
  this.controllers.camera(this);
  this.controllers.viewfinder(this);
  this.controllers.recordingTimer(this);
  this.controllers.indicators(this);
  this.controllers.controls(this);
  this.controllers.overlay(this);
  this.controllers.hud(this);
  this.controllers.zoomBar(this);
  debug('controllers run');
};

/**
 * Lazy load and run a controller.
 *
 * @param  {String} path
 */
App.prototype.loadController = function(path) {
  var self = this;
  this.require([path], function(controller) {
    controller(self);
  });
};

/**
 * Initialize views.
 *
 * @private
 */
App.prototype.initializeViews = function() {
  debug('initializing views');
  this.views.viewfinder = new ViewfinderView();
  this.views.focusRing = new FocusRing();
  this.views.controls = new ControlsView();
  this.views.hud = new HudView();
  this.views.zoomBar = new ZoomBarView();
  this.views.notification = new NotificationView();
  debug('views initialized');
};

/**
 * Put views in the DOM.
 *
 * @private
 */
App.prototype.injectViews = function() {
  debug('injecting views');
  this.views.viewfinder.appendTo(this.el);
  this.views.focusRing.appendTo(this.el);
  this.views.controls.appendTo(this.el);
  this.views.hud.appendTo(this.el);
  this.views.zoomBar.appendTo(this.el);
  this.views.notification.appendTo(this.el);
  debug('views injected');
};

/**
 * Attaches event handlers.
 *
 * @private
 */
App.prototype.bindEvents = function() {
  debug('binding events');

  // App
  this.once('viewfinder:visible', this.onCriticalPathDone);
  this.once('storage:checked:healthy', this.geolocationWatch);
  this.on('visible', this.onVisible);
  this.on('hidden', this.onHidden);

  // DOM
  bind(this.doc, 'visibilitychange', this.onVisibilityChange);
  bind(this.win, 'localized', this.firer('localized'));
  bind(this.win, 'beforeunload', this.onBeforeUnload);
  bind(this.el, 'click', this.onClick);

  debug('events bound');
};

/**
 * Detaches event handlers.
 *
 * @private
 */
App.prototype.unbindEvents = function() {
  unbind(this.doc, 'visibilitychange', this.onVisibilityChange);
  unbind(this.win, 'beforeunload', this.onBeforeUnload);
  this.off('visible', this.onVisible);
  this.off('hidden', this.onHidden);
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
App.prototype.onVisible = function() {
  this.geolocationWatch();
  orientation.start();
  debug('visible');
};

/**
 * Tasks to run when the
 * app is minimised/hidden.
 *
 * @private
 */
App.prototype.onHidden = function() {
  this.geolocation.stopWatching();
  orientation.stop();
  debug('hidden');
};

/**
 * Emit a click event that other
 * modules can listen to.
 *
 * @private
 */
App.prototype.onClick = function() {
  debug('click');
  this.emit('click');
};

/**
 * Log when critical path has completed.
 *
 * @private
 */
App.prototype.onCriticalPathDone = function() {
  var start = window.performance.timing.domLoading;
  var took = Date.now() - start;

  console.log('critical-path took %s', took + 'ms');
  this.loadController(this.controllers.previewGallery);
  this.loadController(this.controllers.storage);
  this.loadController(this.controllers.confirm);
  this.loadController(this.controllers.battery);
  this.loadController(this.controllers.sounds);
  this.loadL10n();

  this.criticalPathDone = true;
  this.emit('criticalpathdone');
};

/**
 * Begins watching location if not within
 * a pending activity and the app isn't
 * currently hidden.
 *
 * Watching is delayed by the `promptDelay`
 * defined in settings.
 *
 * @private
 */
App.prototype.geolocationWatch = function() {
  var delay = this.settings.geolocation.get('promptDelay');
  var shouldWatch = !this.activity.pick && !this.hidden;
  if (shouldWatch) { setTimeout(this.geolocation.watch, delay); }
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
  this.hidden = this.doc.hidden;
  this.emit(this.hidden ? 'hidden' : 'visible');
};

/**
 * Runs just before the
 * app is destroyed.
 *
 * @private
 */
App.prototype.onBeforeUnload = function() {
  this.views.viewfinder.stopStream();
  this.emit('beforeunload');
  debug('beforeunload');
};

/**
 * Initialize l10n 'localized' listener.
 *
 * Sometimes it may have completed
 * before we reach this point, meaning
 * we will have missed the 'localized'
 * event. In this case, we emit the
 * 'localized' event manually.
 *
 * @private
 */
App.prototype.loadL10n = function() {
  this.require(['l10n']);
};

/**
 * States whether localization
 * has completed or not.
 *
 * @return {Boolean}
 * @public
 */
App.prototype.localized = function() {
  var l10n = navigator.mozL10n;
  return l10n && l10n.readyState === 'complete';
};

/**
 * Central place to localize a string.
 *
 * @param  {String} key
 * @public
 */
App.prototype.localize = function(key) {
  var l10n = navigator.mozL10n;
  return (l10n && l10n.get(key)) || key;
};

});
