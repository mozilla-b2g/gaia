define(function(require, exports, module) {
'use strict';

// For perf-measurement related utilities
require('performance-testing-helper');

/**
 * Dependencies
 */

var NotificationView = require('views/notification');
var LoadingView = require('views/loading-screen');
var ViewfinderView = require('views/viewfinder');
var orientation = require('lib/orientation');
var ZoomBarView = require('views/zoom-bar');
var bindAll = require('lib/bind-all');
var model = require('vendor/model');
var debug = require('debug')('app');
var HudView = require('views/hud');
var Pinch = require('lib/pinch');
var bind = require('lib/bind');

/**
 * Exports
 */

module.exports = App;

/**
 * Mixin `Model` API
 */

model(App.prototype);

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
  var self = this;
  bindAll(this);
  this.views = {};
  this.el = options.el;
  this.win = options.win;
  this.doc = options.doc;
  this.require = options.require || window.requirejs;
  this.LoadingView = options.LoadingView || LoadingView; // test hook
  this.inSecureMode = (this.win.location.hash === '#secure');
  this.controllers = options.controllers;
  this.geolocation = options.geolocation;
  this.settings = options.settings;
  this.camera = options.camera;
  this.activity = {};

  //
  // If the system app is opening an attention screen (because
  // of an incoming call or an alarm, e.g.) and if we are
  // currently recording a video then we need to stop recording
  // before the ringer or alarm starts sounding. We will be sent
  // to the background shortly after this and will stop recording
  // when that happens, but by that time it is too late and we
  // have already recorded some sound. See bugs 995540 and 1006200.
  //
  // XXX We're abusing the settings API here to allow the system app
  // to broadcast a message to any certified apps that care. There
  // ought to be a better way, but this is a quick and easy way to
  // fix a last-minute release blocker.
  //
  navigator.mozSettings.addObserver(
    'private.broadcast.attention_screen_opening',
    function(event) {
      // If event.settingValue is true, then an attention screen will
      // soon appear. If it is false, then the attention screen is
      // going away.
      if (event.settingValue) {
        self.emit('attentionscreenopened');
      }
  });

  debug('initialized');
}

/**
 * Runs all the methods to boot the app.
 *
 * The loading screen is shown until the
 * camera is 'ready', then it is taken down.
 *
 * @public
 */
App.prototype.boot = function() {
  debug('boot');
  if (this.booted) { return; }
  this.bindEvents();
  this.initializeViews();
  this.runControllers();

  // PERFORMANCE EVENT (1): moz-chrome-dom-loaded
  // Designates that the app's *core* chrome or navigation interface
  // exists in the DOM and is marked as ready to be displayed.
  window.dispatchEvent(new CustomEvent('moz-chrome-dom-loaded'));

  // PERFORMANCE EVENT (2): moz-chrome-interactive
  // Designates that the app's *core* chrome or navigation interface
  // has its events bound and is ready for user interaction.
  window.dispatchEvent(new CustomEvent('moz-chrome-interactive'));

  this.injectViews();

  this.booted = true;
  debug('booted');
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
  this.require([path], function(controller) { controller(this); }.bind(this));
};

/**
 * Initialize views.
 *
 * @private
 */
App.prototype.initializeViews = function() {
  debug('initializing views');
  this.views.viewfinder = new ViewfinderView();
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
  this.on('camera:ready', this.clearLoading);
  this.on('camera:busy', this.onCameraBusy);
  this.on('visible', this.onVisible);
  this.on('hidden', this.onHidden);

  // DOM
  bind(this.doc, 'visibilitychange', this.onVisibilityChange);

  // we bind to window.onlocalized in order not to depend
  // on l10n.js loading (which is lazy). See bug 999132
  bind(this.win, 'localized', this.firer('localized'));
  bind(this.win, 'beforeunload', this.onBeforeUnload);
  bind(this.el, 'click', this.onClick);

  // Pinch
  this.pinch = new Pinch(this.el);
  this.pinch.on('pinchchanged', this.firer('pinchchanged'));

  debug('events bound');
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

  // PERFORMANCE EVENT (3): moz-app-visually-complete
  // Designates that the app is visually loaded (e.g.: all of the
  // "above-the-fold" content exists in the DOM and is marked as
  // ready to be displayed).
  window.dispatchEvent(new CustomEvent('moz-app-visually-complete'));

  // PERFORMANCE EVENT (4): moz-content-interactive
  // Designates that the app has its events bound for the minimum
  // set of functionality to allow the user to interact with the
  // "above-the-fold" content.
  window.dispatchEvent(new CustomEvent('moz-content-interactive'));

  var start = window.performance.timing.domLoading;
  var took = Date.now() - start;

  // Indicate critical path is done to help track performance
  console.log('critical-path took %s', took + 'ms');

  // Load non-critical modules
  this.loadController(this.controllers.previewGallery);
  this.loadController(this.controllers.storage);
  this.loadController(this.controllers.confirm);
  this.loadController(this.controllers.battery);
  this.loadController(this.controllers.sounds);
  this.loadController(this.controllers.timer);
  this.loadL10n();

  this.criticalPathDone = true;
  this.emit('criticalpathdone');

  // PERFORMANCE EVENT (5): moz-app-loaded
  // Designates that the app is *completely* loaded and all relevant
  // "below-the-fold" content exists in the DOM, is marked visible,
  // has its events bound and is ready for user interaction. All
  // required startup background processing should be complete.
  window.dispatchEvent(new CustomEvent('moz-app-loaded'));
};

/**
 * When the camera indicates it's busy it
 * sometimes passes a `type` string. When
 * this type matches one of our keys in the
 * `loadingScreen` config, we display the
 * loading screen in the given number
 * of milliseconds.
 *
 * @param  {String} type
 * @private
 */
App.prototype.onCameraBusy = function(type) {
  var delay = this.settings.loadingScreen.get(type);
  if (delay) { this.showLoading(delay); }
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
  var shouldWatch = !this.activity.pick && !this.hidden;
  if (shouldWatch) { this.geolocation.watch(); }
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
App.prototype.l10nGet = function(key) {
  var l10n = navigator.mozL10n;
  if (l10n) {
    return l10n.get(key);
  }

  // in case we don't have mozL10n loaded yet, we want to
  // return the key. See bug 999132
  return key;
};

/**
 * Shows the loading screen after the
 * number of ms defined in config.js
 *
 * @param {Number} delay
 * @private
 */
App.prototype.showLoading = function(delay) {
  debug('show loading delay: %s', delay);
  var self = this;
  clearTimeout(this.loadingTimeout);
  this.loadingTimeout = setTimeout(function() {
    self.views.loading = new self.LoadingView();
    self.views.loading.appendTo(self.el).show();
    debug('loading shown');
  }, delay);
};

/**
 * Clears the loadings screen, or
 * any pending loading screen.
 *
 * @private
 */
App.prototype.clearLoading = function() {
  debug('clear loading');
  var view = this.views.loading;
  clearTimeout(this.loadingTimeout);
  if (!view) { return; }
  view.hide(view.destroy);
  this.views.loading = null;
};

});
