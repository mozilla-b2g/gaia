define(function(require, exports, module) {
'use strict';

// For perf-measurement related utilities
require('performance-testing-helper');

/**
 * Dependencies
 */

var debug = require('debug')('app');
var bind = require('lib/bind');
var bindAll = require('lib/bind-all');
var AllDone = require('lib/all-done');
var orientation = require('lib/orientation');
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
  this.require = options.require || window.requirejs; // Test hook
  this.inSecureMode = (this.win.location.hash === '#secure');
  this.settings = options.settings;
  this.activity = {};
  debug('initialized');
}

/**
 * Runs all the methods to boot the app.
 *
 * The loading screen is shown until the
 * app is 'ready', then it is taken down.
 *
 * @public
 */
App.prototype.boot = function() {
  debug('boot');
  this.bindEvents();
  // PERFORMANCE EVENT (1): moz-chrome-dom-loaded
  // Designates that the app's *core* chrome or navigation interface
  // exists in the DOM and is marked as ready to be displayed.
  // PERFORMANCE EVENT (2): moz-chrome-interactive
  // Designates that the app's *core* chrome or navigation interface
  // has its events bound and is ready for user interaction.
  this.dispatchEvent('moz-chrome-dom-loaded');
  this.dispatchEvent('moz-chrome-interactive');

  this.booted = true;
  debug('booted');
};

App.prototype.dispatchEvent = function(name) {
  this.win.dispatchEvent(new CustomEvent(name));
};

/**
 * Attaches event handlers.
 *
 * @private
 */
App.prototype.bindEvents = function() {
  debug('binding events');

  // App
  this.on('busy', this.onBusy);
  this.on('ready', this.onReady);
  this.on('visible', this.onVisible);
  this.on('hidden', this.onHidden);

  // DOM
  bind(this.doc, 'visibilitychange', this.onVisibilityChange);

  // we bind to window.onlocalized in order not to depend
  // on l10n.js loading (which is lazy). See bug 999132
  bind(this.win, 'localized', this.firer('localized'));
  bind(this.win, 'beforeunload', this.onBeforeUnload);
  bind(this.el, 'click', this.onClick);
  debug('events bound');
};

/**
 * Tasks to run when the
 * app becomes visible.
 *
 */
App.prototype.onVisible = function() {
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
  debug('critical path done');

  // PERFORMANCE EVENT (3): moz-app-visually-complete
  // Designates that the app is visually loaded (e.g.: all of the
  // "above-the-fold" content exists in the DOM and is marked as
  // ready to be displayed).
  this.dispatchEvent('moz-app-visually-complete');

  // Load non-critical modules
  this.loadLazyModules();
  this.listenForAttentionScreen();
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

  // All done
  done(function() {
    debug('app fully loaded');

    // PERFORMANCE EVENT (4): moz-content-interactive
    // Designates that the app has its events bound for the minimum
    // set of functionality to allow the user to interact with the
    // "above-the-fold" content.
    self.dispatchEvent('moz-content-interactive');

    // PERFORMANCE EVENT (5): moz-app-loaded
    // Designates that the app is *completely* loaded and all relevant
    // "below-the-fold" content exists in the DOM, is marked visible,
    // has its events bound and is ready for user interaction. All
    // required startup background processing should be complete.
    self.dispatchEvent('moz-app-loaded');
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
  var spinnerTimeouts = this.settings.spinnerTimeouts;
  var timeout = spinnerTimeouts && spinnerTimeouts.get(key);
  var ms = timeout || 0;
  var self = this;

  clearTimeout(this.spinnerTimeout);
  this.spinnerTimeout = setTimeout(function() {
    self.views.loading = new self.LoadingView();
    self.views.loading.appendTo(self.el).show();
    debug('loading shown');
  }, ms);
};

/**
 * When the caller indicates it's busy it
 * sometimes passes a `type` string. When
 * this type matches one of our keys in the
 * `spinnerTimeouts` config, we display the
 * loading screen passing on the type.
 *
 * @param  {String} type
 * @private
 */
App.prototype.onBusy = function(type) {
  debug('application busy, type: %s', type);
  var spinnerTimeouts = this.settings.spinnerTimeouts;
  var delay = spinnerTimeouts && spinnerTimeouts.get(type);
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
 * If the system app is opening an attention screen (because
 * of an incoming call or an alarm, e.g.) and if we are
 * currently recording a video then we need to stop recording
 * before the ringer or alarm starts sounding. We will be sent
 * to the background shortly after this and will stop recording
 * when that happens, but by that time it is too late and we
 * have already recorded some sound. See bugs 995540 and 1006200.
 *
 * XXX We're abusing the settings API here to allow the system app
 * to broadcast a message to any certified apps that care. There
 * ought to be a better way, but this is a quick and easy way to
 * fix a last-minute release blocker.
 *
 * If event.settingValue is true, then an attention screen will
 * soon appear. If it is false, then the attention screen is
 * going away.
 *
 * @private
 */
App.prototype.listenForAttentionScreen = function() {
  debug('listen for attention screen');
  var key = 'private.broadcast.attention_screen_opening';
  navigator.mozSettings.addObserver(key, function(event) {
    if (event.settingValue) {
      debug('attention screen opened');
      self.emit('attentionscreenopened');
    }
  });
};

});
