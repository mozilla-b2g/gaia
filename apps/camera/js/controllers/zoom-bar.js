define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('controller:zoom-bar');
var ZoomBar = require('views/zoom-bar');
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
  bindAll(this);
  this.app = app;
  this.camera = app.camera;
  this.createView();
  this.bindEvents();
  this.configureZoomBar();
  debug('initialized');
}

ZoomBarController.prototype.createView = function() {
  this.view = this.app.views.zoombar || new ZoomBar();
  this.view.hide();
  this.view.appendTo(this.app.el);
};

ZoomBarController.prototype.bindEvents = function() {
  this.view.on('change', this.onChange);

  // TODO: Camera events should be relayed through
  // the app, so that controllers dont' have a
  // hard dependency on each other.
  this.camera.on('zoomconfigured', this.onZoomConfigured);
  this.camera.on('zoomchanged', this.setZoom);
};

ZoomBarController.prototype.configureZoomBar = function() {
  var zoomSupported = this.camera.isZoomSupported();
  var zoomEnabled = this.app.settings.zoom.enabled();
  this.enableZoom = zoomSupported && zoomEnabled;
};

ZoomBarController.prototype.onChange = function(value) {
  var minimumZoom = this.camera.getMinimumZoom();
  var maximumZoom = this.camera.getMaximumZoom();
  var range = maximumZoom - minimumZoom;
  var zoom = (range * value / 100) + minimumZoom;
  this.camera.setZoom(zoom);
};

ZoomBarController.prototype.onZoomConfigured = function(zoom) {
  this.configureZoomBar();
  this.setZoom(zoom);
  this.view.hide();
};

ZoomBarController.prototype.setZoom = function(zoom) {
  if (!this.enableZoom) {
    return;
  }

  debug('set zoom');
  var minimumZoom = this.camera.getMinimumZoom();
  var maximumZoom = this.camera.getMaximumZoom();
  var range = maximumZoom - minimumZoom;
  var percent = (zoom - minimumZoom) / range * 100;
  this.view.setValue(percent);
  debug('zoom set');
};

});
