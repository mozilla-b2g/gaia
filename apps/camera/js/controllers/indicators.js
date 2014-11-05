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
  this.app = app;
  this.settings = app.settings;
  this.configure = this.configure.bind(this);
  this.createView();
  this.configure();
  this.bindEvents();
  debug('initialized');
}

/**
 * Creates and injects the view.
 *
 * The view is hidden until the
 * settings are configured.
 *
 * @private
 */
IndicatorsController.prototype.createView = function() {
  debug('create view');
  this.view = this.app.views.indicators || new IndicatorsView();
  this.view.appendTo(this.app.el);
  debug('view created');
};

/**
 * Bind to relevant events.
 *
 * @public
 */
IndicatorsController.prototype.bindEvents = function() {
  this.settings.timer.on('change:selected', this.view.setter('timer'));
  this.settings.mode.on('change:selected', this.view.setter('mode'));
  this.settings.hdr.on('change:selected', this.view.setter('hdr'));
  this.app.on('change:batteryStatus', this.view.setter('battery'));
  this.app.on('change:recording', this.view.setter('recording'));
  this.app.on('settings:configured', this.configure);
  debug('events bound');
};

/**
 * Configures the view to match
 * current settings state.
 *
 * @private
 */
IndicatorsController.prototype.configure = function() {
  debug('configuring');
  this.view.set('hdr', this.settings.hdr.selected('key'));
  this.view.set('timer', this.settings.timer.selected('key'));
  this.view.set('battery', this.app.get('batteryStatus'));
  debug('configured');
};

});