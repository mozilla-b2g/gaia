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
  this.settings = app.settings;
  this.viewfinder = app.views.viewfinder;
  this.focusTimeout = null;
  this.bindEvents();
  this.configure();
  debug('initialized');
}

/**
 * Initial configuration.
 *
 * @private
 */
ViewfinderController.prototype.configure = function() {
  this.sensitivity = window.ZOOM_GESTURE_SENSITIVITY * window.innerWidth;

  this.configureScaleType();
  this.configureGrid();
};

/**
 * Configure the viewfinder scale type,
 * aspect fill/fit, depending on setting.
 *
 * @private
 */
ViewfinderController.prototype.configureScaleType = function() {
  var scaleType = this.app.settings.viewfinder.get('scaleType');
  this.viewfinder.scaleType = scaleType;
  debug('set scale type: %s', scaleType);
};

/**
 * Show/hide grid depending on currently
 * selected option.
 *
 * @private
 */
ViewfinderController.prototype.configureGrid = function() {
  var grid = this.app.settings.grid.selected('key');
  this.viewfinder.set('grid', grid);
};

/**
 * Hides the viewfinder frame-grid.
 *
 * @private
 */
ViewfinderController.prototype.hideGrid = function() {
  this.viewfinder.set('grid', 'off');
};

/**
 * Bind to relavant events.
 *
 * @private
 */
ViewfinderController.prototype.bindEvents = function() {
  this.app.settings.grid.on('change:selected', this.viewfinder.setter('grid'));
  this.viewfinder.on('click', this.app.firer('viewfinder:click'));
  this.camera.on('zoomchanged', this.onZoomChanged);
  this.app.on('camera:shutter', this.onShutter);
  this.app.on('camera:focuschanged', this.viewfinder.setFocusState);
  this.app.on('camera:configured', this.onCameraConfigured);
  this.app.on('previewgallery:closed', this.onPreviewGalleryClosed);
  this.app.on('previewgallery:opened', this.stopStream);
  this.app.on('settings:closed', this.configureGrid);
  this.app.on('settings:opened', this.hideGrid);
  // when we set FocusMode eg. faceTracking or Fixed ect.
  //this event will called.
  this.app.on('camera:focusMode', this.onFocusModeChange);
  this.app.on('hidden', this.stopStream);
  this.app.on('pinchchanged', this.onPinchChanged);
};

/**
 * Perform required viewfinder configuration
 * once the camera has configured.
 *
 * @private
 */
ViewfinderController.prototype.onCameraConfigured = function() {
  debug('configuring');
  this.startStream();
  this.configurePreview();
  this.configureZoom();

  // BUG: We have to use a 300ms timeout here
  // to conceal a Gecko rendering bug whereby the
  // video element appears not to have painted the
  // newly set dimensions before fading in.
  // https://bugzilla.mozilla.org/show_bug.cgi?id=982230
  if (!this.app.criticalPathDone) { this.show(); }
  else { setTimeout(this.show, 280); }
};

ViewfinderController.prototype.show = function() {
  this.viewfinder.fadeIn();
  this.app.emit('viewfinder:visible');
};

ViewfinderController.prototype.onShutter = function() {
  this.viewfinder.setFocusState('none');
  this.viewfinder.shutter();
};

/**
 * Starts the stream, only if
 * the app is currently visible.
 *
 * @private
 */
ViewfinderController.prototype.onPreviewGalleryClosed = function() {
  if (this.app.hidden) { return; }
  this.startStream();
};

/**
 * Start the viewfinder stream flowing
 * with the current camera configuration.
 *
 * This indirectly enforces a screen wakelock,
 * meaning the device is unable to go to sleep.
 *
 * We don't want the stream to start flowing if
 * the preview-gallery is open, as this prevents
 * the device falling asleep.
 *
 * @private
 */
ViewfinderController.prototype.startStream = function() {
  if (this.app.get('previewGalleryOpen')) { return; }
  this.camera.loadStreamInto(this.viewfinder.els.video);
  debug('stream started');
};

/**
 * Stop the preview stream flowing.
 *
 * This indirectly removes the wakelock
 * that is magically enforced by the
 * flowing camera stream. Meaning the
 * device is able to go to sleep.
 *
 * @private
 */
ViewfinderController.prototype.stopStream = function() {
  this.viewfinder.stopStream();
  debug('stream stopped');
};

/**
 * Configure the size and postion
 * of the preview video stream.
 *
 * @private
 */
ViewfinderController.prototype.configurePreview = function() {
  var camera = this.app.settings.cameras.selected('key');
  var isFrontCamera = camera === 'front';
  var sensorAngle = this.camera.getSensorAngle();
  var previewSize = this.camera.previewSize();

  this.viewfinder.updatePreview(previewSize, sensorAngle, isFrontCamera);
};

/**
 * Configures the viewfinder
 * to the current camera.
 *
 * @private
 */
ViewfinderController.prototype.configureZoom = function() {
  var zoomSupported = this.camera.isZoomSupported();
  var zoomEnabled = this.app.settings.zoom.enabled();
  var enableZoom = zoomSupported && zoomEnabled;

  if (!enableZoom) {
    this.viewfinder.disableZoom();
    return;
  }

  var minimumZoom = this.camera.getMinimumZoom();
  var maximumZoom = this.camera.getMaximumZoom();

  this.viewfinder.enableZoom(minimumZoom, maximumZoom);
};

/**
 * Updates the zoom level on the camera
 * when the pinch changes.
 *
 * @private
 */
ViewfinderController.prototype.onPinchChanged = function(deltaPinch) {
  var zoom = this.viewfinder._zoom * (1 + (deltaPinch / this.sensitivity));
  this.viewfinder.setZoom(zoom);
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
ViewfinderController.prototype.onZoomChanged = function(zoom) {
  var zoomPreviewAdjustment = this.camera.getZoomPreviewAdjustment();
  this.viewfinder.setZoomPreviewAdjustment(zoomPreviewAdjustment);
  this.viewfinder.setZoom(zoom);
};

/**
 * Responds to changes of the `Focus mode` 
 * @param {String} [faceTracking,fixedFocus,continuousFocus,touchFocus]
 * set the Mode for view
 */
ViewfinderController.prototype.onFocusModeChange = function(value) {
  this.viewfinder.setFocusMode(value);
  if (value === 'continuousFocus') {
    this.setFocusRingPosition();
  }
};

});
