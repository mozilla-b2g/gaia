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
  bindAll(this);
  this.views = {};
  this.el = options.el;
  this.win = options.win;
  this.doc = options.doc;
  this.inSecureMode = (this.win.location.hash === '#secure');
  this.controllers = options.controllers;
  this.geolocation = options.geolocation;
  this.activity = options.activity;
  this.settings = options.settings;
  this.storage = options.storage;
  this.camera = options.camera;
  this.sounds = options.sounds;
  debug('initialized');
}

/**
 * Runs all the methods
 * to boot the app.
 *
 * @public
 */
App.prototype.boot = function() {
  if (this.didBoot) { return; }
  this.initializeViews();
  this.runControllers();
  this.injectViews();
  this.bindEvents();
  this.configureL10n();
  this.emit('boot');
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
  debug('running controllers');
  this.controllers.settings(this);
  this.controllers.activity(this);
  this.controllers.timer(this);
  this.controllers.camera(this);
  this.controllers.viewfinder(this);
  this.controllers.recordingTimer(this);
  this.controllers.indicators(this);
  this.controllers.previewGallery(this);
  this.controllers.controls(this);
  this.controllers.confirm(this);
  this.controllers.overlay(this);
  this.controllers.sounds(this);
  this.controllers.hud(this);
  this.controllers.zoomBar(this);
  this.controllers.battery(this);
  debug('controllers run');
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
  this.storage.once('checked:healthy', this.geolocationWatch);
  bind(this.doc, 'visibilitychange', this.onVisibilityChange);
  bind(this.win, 'beforeunload', this.onBeforeUnload);
  bind(this.el, 'click', this.onClick);
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
  this.geolocationWatch();
  this.storage.check();
  orientation.start();
  debug('focus');
};

/**
 * Tasks to run when the
 * app is minimised/hidden.
 */
App.prototype.onBlur = function() {
  this.geolocation.stopWatching();
  orientation.stop();
  debug('blur');
};

App.prototype.onClick = function() {
  debug('click');
  this.emit('click');
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
  var shouldWatch = !this.activity.active && !this.doc.hidden;
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
App.prototype.configureL10n = function() {
  var complete = navigator.mozL10n.readyState === 'complete';
  bind(this.win, 'localized', this.firer('localized'));
  if (complete) { this.emit('localized'); }
};

});
