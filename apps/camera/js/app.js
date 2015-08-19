define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var NotificationView = require('views/notification');
var LoadingView = require('views/loading-screen');
var orientation = require('lib/orientation');
var bindAll = require('lib/bind-all');
var AllDone = require('lib/all-done');
var debug = require('debug')('app');
var Pinch = require('lib/pinch');
var bind = require('lib/bind');
var model = require('model');

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
  bindAll(this);
  this.views = {};
  this.el = options.el;
  this.win = options.win;
  this.doc = options.doc;
  this.perf = options.perf || {};
  this.pinch = options.pinch || new Pinch(this.el); // Test hook
  this.require = options.require || window.requirejs; // Test hook
  this.LoadingView = options.LoadingView || LoadingView; // test hook
  this.orientation = options.orientation || orientation; // test hook
  this.inSecureMode = (this.win.location.hash === '#secure');
  this.controllers = options.controllers;
  this.geolocation = options.geolocation;
  this.settings = options.settings;
  this.camera = options.camera;
  this.activity = {};
  this.sounds = options.sounds;
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
  this.showSpinner('requestingCamera');
  this.bindEvents();
  this.initializeViews();
  this.runControllers();

  // PERFORMANCE MARKER (1): navigationLoaded
  // Designates that the app's *core* chrome or navigation interface
  // exists in the DOM and is marked as ready to be displayed.
  // PERFORMANCE MARKER (2): navigationInteractive
  // Designates that the app's *core* chrome or navigation interface
  // has its events bound and is ready for user interaction.
  window.performance.mark('navigationLoaded');
  window.performance.mark('navigationInteractive');

  this.injectViews();
  this.booted = true;
  debug('booted');
};

App.prototype.dispatchEvent = function(name) {
  this.win.dispatchEvent(new CustomEvent(name));
};

/**
 * Runs controllers to glue all
 * the parts of the app together.
 *
 * @private
 */
App.prototype.runControllers = function() {
  debug('run controllers');
  this.controllers.overlay(this);
  this.controllers.battery(this);
  this.controllers.settings(this);
  this.controllers.activity(this);
  this.controllers.camera(this);
  this.controllers.viewfinder(this);
  this.controllers.hud(this);
  this.controllers.controls(this);
  debug('controllers run');
};

/**
 * Load and run all the lazy controllers.
 *
 * @param  {Function} done
 */
App.prototype.loadLazyControllers = function(done) {
  debug('load lazy controllers');
  var self = this;
  this.require(this.controllers.lazy, function() {
    [].forEach.call(arguments, function(controller) { controller(self); });
    debug('controllers loaded');
    done();
  });
};

/**
 * Initialize views.
 *
 * @private
 */
App.prototype.initializeViews = function() {
  debug('initializing views');
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
  this.once('storage:checked:healthy', this.geolocationWatch);
  this.once('viewfinder:visible', this.onCriticalPathDone);
  this.once('camera:error', this.onCriticalPathDone);
  this.on('camera:willchange', this.firer('busy'));
  this.on('ready', this.clearSpinner);
  this.on('visible', this.onVisible);
  this.on('hidden', this.onHidden);
  this.on('reboot', this.onReboot);
  this.on('busy', this.onBusy);

  // Pinch
  this.pinch.on('changed', this.firer('pinch:changed'));
  this.on('previewgallery:opened', this.pinch.disable);
  this.on('previewgallery:closed', this.pinch.enable);
  this.on('settings:opened', this.pinch.disable);
  this.on('settings:closed', this.pinch.enable);

  // DOM
  bind(this.doc, 'visibilitychange', this.onVisibilityChange);

  // we bind to window.onlocalized in order not to depend
  // on l10n.js loading (which is lazy). See bug 999132
  bind(this.win, 'localized', this.firer('localized'));

  bind(this.win, 'beforeunload', this.onBeforeUnload);
  bind(this.win, 'keydown', this.onKeyDown);
  bind(this.el, 'click', this.onClick);
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
  this.orientation.start();
  this.orientation.lock();
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
  this.orientation.stop();
  debug('hidden');
};


/**
 * Reboots the application
 *
 * @private
 */
App.prototype.onReboot = function() {
  debug('reboot');
  window.location.reload();
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
  if (this.criticalPathDone) { return; }
  debug('critical path done');
  // PERFORMANCE MARKER (3): visuallyLoaded
  // Designates that the app is visually loaded (e.g.: all of the
  // "above-the-fold" content exists in the DOM and is marked as
  // ready to be displayed).
  window.performance.mark('visuallyLoaded');

  // Load non-critical modules
  this.loadLazyModules();
  this.perf.criticalPath = Date.now();
  this.criticalPathDone = true;
  this.emit('criticalpathdone');
};

App.prototype.loadLazyModules = function() {
  debug('load lazy modules');
  var done = AllDone();
  var self = this;

  this.loadL10n(done());
  this.loadLazyControllers(done());
  this.once('storage:checked', done());

  // All done
  done(function() {
    debug('app fully loaded');

    // PERFORMANCE MARKER (4): contentInteractive
    // Designates that the app has its events bound for the minimum
    // set of functionality to allow the user to interact with the
    // "above-the-fold" content.
    window.performance.mark('contentInteractive');

    // PERFORMANCE MARKER (5): fullyLoaded
    // Designates that the app is *completely* loaded and all relevant
    // "below-the-fold" content exists in the DOM, is marked visible,
    // has its events bound and is ready for user interaction. All
    // required startup background processing should be complete.
    window.performance.mark('fullyLoaded');
    self.perf.loaded = Date.now();
    self.loaded = true;
    self.emit('loaded');
    self.logPerf();
  });
};

App.prototype.logPerf =function() {
  var timing = window.performance.timing;
  console.log('domloaded: %s',
    timing.domComplete - timing.domLoading + 'ms');
  console.log('first module: %s',
    this.perf.firstModule - this.perf.jsStarted + 'ms');
  console.log('critical-path: %s',
    this.perf.criticalPath -  timing.domLoading + 'ms');
  console.log('app-fully-loaded: %s',
    this.perf.loaded - timing.domLoading + 'ms');
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
App.prototype.loadL10n = function(done) {
  this.require(['l10n'], done);
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
 * @param {String} type
 * @private
 */
App.prototype.showSpinner = function(key) {
  debug('show loading type: %s', key);

  var view = this.views.loading;
  if (view) {
    return;
  }

  var ms = this.settings.spinnerTimeouts.get(key) || 0;
  var self = this;

  clearTimeout(this.spinnerTimeout);
  this.spinnerTimeout = setTimeout(function() {
    self.views.loading = new self.LoadingView();
    self.views.loading.appendTo(self.el).show();
    debug('loading shown');
  }, ms);
};

/**
 * Clears the loadings screen, or
 * any pending loading screen.
 *
 * @private
 */
App.prototype.clearSpinner = function() {
  debug('clear loading');
  var view = this.views.loading;
  clearTimeout(this.spinnerTimeout);
  if (!view) { return; }
  view.hide(view.destroy);
  this.views.loading = null;
};

/**
 * When the camera indicates it's busy it
 * sometimes passes a `type` string. When
 * this type matches one of our keys in the
 * `spinnerTimeouts` config, we display the
 * loading screen passing on the type.
 *
 * @param  {String} type
 * @private
 */
App.prototype.onBusy = function(type) {
  debug('camera busy, type: %s', type);
  var delay = this.settings.spinnerTimeouts.get(type);
  if (delay) { this.showSpinner(type); }
};

/**
 * Clears the loadings screen, or
 * any pending loading screen.
 *
 * @private
 */
App.prototype.onReady = function() {
  debug('ready');
  var view = this.views.loading;
  clearTimeout(this.spinnerTimeout);
  if (!view) { return; }
  view.hide(view.destroy);
  this.views.loading = null;
};

/**
 * When the device's hardware keys
 * are pressed we emit a global
 * app event that other controllers
 * can respond to.
 *
 * TIP: Check config.js for the map
 * of key names to types.
 *
 * @param  {Event} e
 * @private
 */
App.prototype.onKeyDown = function(e) {
  var key = e.key.toLowerCase();
  var type = this.settings.keyDownEvents.get(key);
  if (type) { this.emit('keydown:' + type, e); }
};


});
