define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('controller:indicators');
var IndicatorsView = require('views/indicators');

/**
 * Exports
 */

module.exports = function(app) { return new IndicatorsController(app); };
module.exports.IndicatorsController = IndicatorsController;

/**
 * Initialize a new `IndicatorsController`
 *
 * @param {Object} options
 */
function IndicatorsController(app) {
  debug('initializing');
  this.app = app;
  this.settings = app.settings;
  this.enabled = this.settings.indicators.get('enabled');
  this.onSettingsConfigured = this.onSettingsConfigured.bind(this);
  this.configure();
  debug('initialized');
}

/**
 * Initial configuration. Injects
 * view and binds events.
 *
 * @private
 */
IndicatorsController.prototype.configure = function() {
  if (!this.enabled) { return; }
  this.view = this.app.views.indicators || new IndicatorsView();
  this.view.appendTo(this.app.el);
  this.bindEvents();
  debug('events bound');
};

/**
 * Update the view when related
 * settings and app state change.
 *
 * Configure each time the settings
 * configure.
 *
 * @public
 */
IndicatorsController.prototype.bindEvents = function() {
  this.settings.timer.on('change:selected', this.view.setter('timer'));
  this.settings.hdr.on('change:selected', this.view.setter('hdr'));
  this.app.on('change:batteryStatus', this.view.setter('battery'));
  this.app.on('settings:configured', this.onSettingsConfigured);
  debug('events bound');
};

/**
 * Enables supported indicators,
 * configures initial state and
 * then shows the view.
 *
 * @private
 */
IndicatorsController.prototype.onSettingsConfigured = function() {
  debug('configuring');
  this.configureEnabled();
  this.view.set('hdr', this.settings.hdr.selected('key'));
  this.view.set('timer', this.settings.timer.selected('key'));
  this.view.show();
  debug('configured');
};

/**
 * Configures the enabling/disabling
 * of all keys in the indicator config.
 *
 * @private
 */
IndicatorsController.prototype.configureEnabled = function() {
  for (var key in this.enabled) { this.enable(key, this.enabled[key]); }
};

/**
 * Enables an indicator in the view,
 * if truthy in indicator config, and
 * not a setting, or is a 'supported'
 * setting.
 *
 * @param  {String} key
 * @param {Boolean} enabled
 * @private
 */
IndicatorsController.prototype.enable = function(key, enabled) {
  var setting = this.settings[key];
  var shouldEnable = enabled && (!setting || setting.supported());
  this.view.enable(key, shouldEnable);
  debug('enable key: %s, shouldEnable: %s', key, shouldEnable);
};

});