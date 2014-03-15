define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('controller:zoom-bar');
var bindAll = require('lib/bind-all');
/**
 * Exports
 */

module.exports = function(app) { return new ZoomBarController(app); };
module.exports.ZoomBarController = ZoomBarController;

/**
 * Initialize a new `ZoomBarController`
 *
 * @param {App} app
 */
function ZoomBarController(app) {
  debug('initializing');
  bindAll(this);
  this.app = app;
  this.camera = app.camera;
  this.viewfinder = app.views.viewfinder;
  this.zoomBar = app.views.zoomBar;
  this.bindEvents();
  debug('initialized');
}

ZoomBarController.prototype.bindEvents = function() {
  this.zoomBar.on('change', this.onChange);
  this.camera.on('zoomChange', this.onZoomChange);
  this.viewfinder.on('pinchStart', this.onPinchStart);
  this.viewfinder.on('pinchEnd', this.onPinchEnd);
};

ZoomBarController.prototype.onChange = function(value) {
  var minimumZoom = this.camera.getMinimumZoom();
  var maximumZoom = this.camera.getMaximumZoom();
  var range = maximumZoom - minimumZoom;
  var zoom = (range * value / 100) + minimumZoom;
  this.camera.setZoom(zoom);
};

ZoomBarController.prototype.onZoomChange = function(zoom) {
  var minimumZoom = this.camera.getMinimumZoom();
  var maximumZoom = this.camera.getMaximumZoom();
  var range = maximumZoom - minimumZoom;
  var percent = (zoom - minimumZoom) / range * 100;
  this.zoomBar.setValue(percent);
};

ZoomBarController.prototype.onPinchStart = function() {
  this.zoomBar.setScrubberActive(true);
};

ZoomBarController.prototype.onPinchEnd = function() {
  this.zoomBar.setScrubberActive(false);
};

});
