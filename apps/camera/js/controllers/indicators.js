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
  this.enabled = this.settings.indicators.get('enabled');
  if (this.enabled) { this.bindEvents(); }
  debug('initialized');
}

IndicatorsController.prototype.bindEvents = function() {

    this.app.on('settings:configured', this.configure);

  if (this.enabled.timer) {
    this.settings.timer.on('change:selected', this.indicators.setter('timer'));
  }
  
  if (this.enabled.hdr) {
    this.settings.hdr.on('change:selected', this.indicators.setter('hdr'));
  }
  
  if (this.enabled.geolocation) {
    this.app.geolocation.on('geolocation', this.geoLocationStatus);
  }

  if (this.enabled.battery) {
    this.app.on('change:batteryStatus', this.indicators.setter('battery')); 
  }

};

IndicatorsController.prototype.configure = function() {
  if (this.enabled.hdr) {
    this.indicators.set('hdr', this.settings.hdr.selected('key'));
  }
  
  if (this.enabled.timer) {
    this.indicators.set('timer', this.settings.timer.selected('key'));
  }
  
  if (this.enabled.geolocation) {
    this.updateGeolocationStatus(this.app.geolocation.position);
  }
  
  this.indicators.show();
};

IndicatorsController.prototype.updateGeolocationStatus = function(position) {
  if (position) {
    this.indicators.set('geotagging', 'on');
  } else {
    this.indicators.set('geotagging', 'off');
  }      
};

});