define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var PerformanceTestingHelper = require('performance-testing-helper');
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
  if (this.booted) { return; }
  this.bindEvents();
  this.initializeViews();
  this.runControllers();
  this.injectViews();
  this.booted = true;
  this.showLoading();
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
  var self = this;
  this.require([path, 'lib/string-utils'],
    function(controller, StringUtils) {
      var name = StringUtils.toCamelCase(
        StringUtils.lastPathComponent(path));

      self.controllers[name] = controller(self);
    }
  );
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
  var start = window.performance.timing.domLoading;
  var took = Date.now() - start;

  PerformanceTestingHelper.dispatch('startup-path-done');
  console.log('critical-path took %s', took + 'ms');

  this.clearLoading();
  this.loadController(this.controllers.previewGallery);
  this.loadController(this.controllers.storage);
  this.loadController(this.controllers.confirm);
  this.loadController(this.controllers.battery);
  this.loadController(this.controllers.sounds);
  this.loadController(this.controllers.timer);
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
 * @private
 */
App.prototype.showLoading = function() {
  debug('show loading');
  var ms = this.settings.loadingScreen.get('delay');
  var self = this;
  clearTimeout(this.loadingTimeout);
  this.loadingTimeout = setTimeout(function() {
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
App.prototype.clearLoading = function() {
  debug('clear loading');
  var view = this.views.loading;
  clearTimeout(this.loadingTimeout);
  if (!view) { return; }
  view.hide(view.destroy);
};

});
