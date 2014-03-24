define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('controller:viewfinder');
var bindAll = require('lib/bind-all');
/**
 * Exports
 */

module.exports = function(app) { return new ViewfinderController(app); };
module.exports.ViewfinderController = ViewfinderController;

/**
 * Initialize a new `ViewfinderController`
 *
 * @param {App} app
 */
function ViewfinderController(app) {
  debug('initializing');
  bindAll(this);
  this.app = app;
  this.camera = app.camera;
  this.activity = app.activity;
  this.filmstrip = app.filmstrip;
  this.settings = app.settings;
  this.viewfinder = app.views.viewfinder;
  this.bindEvents();
  this.configure();
  debug('initialized');
}

ViewfinderController.prototype.configure = function() {
  this.configureScaleType();
  this.configureGrid();
};

ViewfinderController.prototype.configureScaleType = function() {
  var scaleType = this.app.settings.viewfinder.get('scaleType');
  this.viewfinder.scaleType = scaleType;
  debug('set scale type: %s', scaleType);
};

ViewfinderController.prototype.configureGrid = function() {
  var grid = this.app.settings.grid.selected('key');
  this.viewfinder.set('grid', grid);
};

ViewfinderController.prototype.hideGrid = function() {
  this.viewfinder.set('grid', 'off');
};

ViewfinderController.prototype.bindEvents = function() {
  this.app.settings.on('change:grid', this.viewfinder.setter('grid'));
  this.viewfinder.on('click', this.app.firer('viewfinder:click'));
  this.viewfinder.on('click', this.onViewfinderClick);
  this.viewfinder.on('pinchChange', this.onPinchChange);
  this.viewfinder.on('updatedPreview', this.app.firer('viewfinder:ready'));
  this.app.on('camera:configured', this.loadStream);
  this.app.on('camera:configured', this.updatePreview);
  this.app.on('camera:shutter', this.viewfinder.shutter);
  this.app.on('settings:opened', this.hideGrid);
  this.app.on('settings:closed', this.configureGrid);
  this.camera.on('zoomChange', this.onZoomChange);
};

ViewfinderController.prototype.loadStream = function() {
  this.camera.loadStreamInto(this.viewfinder.els.video);
};

ViewfinderController.prototype.updatePreview = function() {
  var camera = this.app.settings.cameras.selected('key');
  var isFrontCamera = camera === 'front';
  var sensorAngle = this.camera.getSensorAngle();
  this.viewfinder.updatePreview(this.camera.previewSize(), sensorAngle,
                                isFrontCamera);

  var enableZoom = this.camera.isZoomSupported() &&
                   this.app.settings.enableZoom.selected().value;
  if (enableZoom) {
    this.viewfinder.enableZoom(this.camera.getMinimumZoom(),
                               this.camera.getMaximumZoom());
  } else {
    this.viewfinder.disableZoom();
  }

  // BUG: We have to use a 300ms timeout here
  // to conceal a Gecko rendering bug whereby the
  // video element appears not to have painted the
  // newly set dimensions before fading in.
  // https://bugzilla.mozilla.org/show_bug.cgi?id=982230
  setTimeout(this.viewfinder.fadeIn, 300);
};

ViewfinderController.prototype.onPinchChange = function(zoom) {
  this.camera.setZoom(zoom);
};

/**
 * Responds to changes of the `zoom` value on the Camera to update the
 * view's internal state so that the pinch-to-zoom gesture can resume
 * zooming from the updated value. Also, updates the CSS scale transform
 * on the <video/> tag to compensate for zooming beyond the
 * `maxHardwareZoom` value.
 *
 * @param {Number} zoom
 */
ViewfinderController.prototype.onZoomChange = function(zoom) {
  var zoomPreviewAdjustment = this.camera.getZoomPreviewAdjustment();
  this.viewfinder.setZoomPreviewAdjustment(zoomPreviewAdjustment);
  this.viewfinder.setZoom(zoom);
};

/**
 * Toggles the filmstrip, but not
 * whilst recording or within an
 * activity session.
 *
 * @private
 */
ViewfinderController.prototype.onViewfinderClick = function() {
  var recording = this.app.get('recording');
  if (recording || this.activity.active) { return; }
  debug('click');
};

});
