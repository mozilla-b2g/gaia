define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('controller:viewfinder');
var bindAll = require('lib/bind-all');
var constants = require('config/camera');

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
  this.focusRing = app.views.focusRing;
  this.pinch = new app.Pinch(app.el);
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
  this.sensitivity = constants.ZOOM_GESTURE_SENSITIVITY * window.innerWidth;

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
  this.camera.on('zoomconfigured', this.onZoomConfigured);
  this.app.on('camera:focuschanged', this.focusRing.setState);
  this.app.on('camera:configured', this.onCameraConfigured);
  this.app.on('camera:shutter', this.onShutter);
  this.app.on('camera:previewactive', this.onPreviewActive);
  this.app.on('previewgallery:opened', this.onGalleryOpened);
  this.app.on('previewgallery:closed', this.onGalleryClosed);
  this.app.on('settings:closed', this.onSettingsClosed);
  this.app.on('settings:opened', this.onSettingsOpened);
  this.pinch.on('pinchchanged', this.onPinchChanged);
};

/**
 * Perform required viewfinder configuration
 * once the camera has configured.
 *
 * @private
 */
ViewfinderController.prototype.onCameraConfigured = function() {
  var self = this;
  this.loadStream();
  this.configurePreview();

  // BUG: We have to use a 300ms timeout here
  // to conceal a Gecko rendering bug whereby the
  // video element appears not to have painted the
  // newly set dimensions before fading in.
  // https://bugzilla.mozilla.org/show_bug.cgi?id=982230
  setTimeout(function() {
    self.viewfinder.fadeIn(self.app.firer('viewfinder:visible'));
  }, 300);
};

ViewfinderController.prototype.onShutter = function() {
  this.focusRing.setState('none');
  this.viewfinder.shutter();
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
ViewfinderController.prototype.loadStream = function() {
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
ViewfinderController.prototype.onZoomConfigured = function() {
  var zoomSupported = this.camera.isZoomSupported();
  var zoomEnabled = this.app.settings.zoom.enabled();
  var enableZoom = zoomSupported && zoomEnabled;

  if (!enableZoom) {
    this.viewfinder.disableZoom();
    return;
  }

  if (this.app.settings.zoom.get('useZoomPreviewAdjustment')) {
    this.viewfinder.enableZoomPreviewAdjustment();
  } else {
    this.viewfinder.disableZoomPreviewAdjustment();
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

ViewfinderController.prototype.onSettingsOpened = function() {
  this.hideGrid();
  this.pinch.disable();
};

ViewfinderController.prototype.onSettingsClosed = function() {
  this.configureGrid();
  this.pinch.enable();
};

ViewfinderController.prototype.onGalleryOpened = function() {
  // Disables events when the gallery opens
  this.viewfinder.disable();
  this.pinch.disable();
};

ViewfinderController.prototype.onGalleryClosed = function() {
  if (this.app.hidden) {
    return;
  }

  // Renables events when the gallery closes
  this.viewfinder.enable();
  this.pinch.enable();
};

ViewfinderController.prototype.onPreviewActive = function(active) {
  if (!active) {
    this.stopStream();
  }
};

});
