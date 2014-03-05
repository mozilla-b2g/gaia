define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('controller:indicator');
var bindAll = require('lib/bind-all');

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
  bindAll(this);
  this.app = app;
  this.settings = app.settings;
  this.indicators = app.views.indicators;
  var enabled = this.settings.showIndicators.selected('value');
  if (enabled) { this.bindEvents(); }
  debug('initialized');
}

IndicatorsController.prototype.bindEvents = function() {
  this.settings.timer.on('change:selected', this.indicators.setter('timer'));
  this.settings.hdr.on('change:selected', this.indicators.setter('hdr'));
  this.app.on('settings:configured', this.configure);
};

IndicatorsController.prototype.configure = function() {
  this.indicators.set('hdr', this.settings.hdr.selected('key'));
  this.indicators.set('timer', this.settings.timer.selected('key'));
  this.indicators.show();
};

});