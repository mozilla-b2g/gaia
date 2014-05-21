define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('controller:viewfinder');
var bindAll = require('lib/bind-all');
var FocusView = require('views/focus');
var calculateFocusArea = require('lib/calculate-focus-area');

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
  this.views = {};
  this.camera = app.camera;
  this.activity = app.activity;
  this.settings = app.settings;
  this.views.viewfinder = app.views.viewfinder;
  // Append focus ring to viewfinder
  this.views.focus = new FocusView();
  this.views.focus.appendTo(this.views.viewfinder.el);
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
  var settings = this.app.settings;
  var zoomSensitivity = settings.viewfinder.get('zoomGestureSensitivity');
  this.sensitivity = zoomSensitivity * window.innerWidth;
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
  this.views.viewfinder.scaleType = scaleType;
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
  this.views.viewfinder.set('grid', grid);
};

/**
 * Hides the viewfinder frame-grid.
 *
 * @private
 */
ViewfinderController.prototype.hideGrid = function() {
  this.views.viewfinder.set('grid', 'off');
};

/**
 * Bind to relavant events.
 *
 * @private
 */
ViewfinderController.prototype.bindEvents = function() {
  this.app.settings.grid.on('change:selected',
    this.views.viewfinder.setter('grid'));

  this.views.viewfinder.on('click', this.app.firer('viewfinder:click'));
  this.views.viewfinder.on('click', this.onViewfinderClicked);

  this.camera.on('zoomchanged', this.onZoomChanged);
  this.camera.on('zoomconfigured', this.onZoomConfigured);
  this.app.on('camera:focusconfigured', this.onFocusConfigured);
  this.app.on('camera:focusstatechanged', this.views.focus.setFocusState);
  this.app.on('camera:shutter', this.views.viewfinder.shutter);
  this.app.on('camera:busy', this.views.viewfinder.disable);
  this.app.on('camera:ready', this.views.viewfinder.enable);
  this.app.on('previewgallery:closed', this.onPreviewGalleryClosed);
  this.app.on('camera:configured', this.onCameraConfigured);
  this.app.on('previewgallery:opened', this.stopStream);
  this.app.on('settings:closed', this.configureGrid);
  this.app.on('settings:opened', this.hideGrid);
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

  // BUG: We have to use a 300ms timeout here
  // to conceal a Gecko rendering bug whereby the
  // video element appears not to have painted the
  // newly set dimensions before fading in.
  // https://bugzilla.mozilla.org/show_bug.cgi?id=982230
  if (!this.app.criticalPathDone) { this.show(); }
  else { setTimeout(this.show, 280); }
};

ViewfinderController.prototype.show = function() {
  this.views.viewfinder.fadeIn();
  this.app.emit('viewfinder:visible');
};

/**
 *  Sets appropiate flags when the camera focus is configured
 */
ViewfinderController.prototype.onFocusConfigured = function(config) {
  this.views.focus.setFocusMode(config.mode);
  this.touchFocusEnabled = config.touchFocus;
  this.views.focus.enable('face-tracking', config.faceTracking);
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
  this.camera.loadStreamInto(this.views.viewfinder.els.video);
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
  this.views.viewfinder.stopStream();
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

  this.views.viewfinder.updatePreview(previewSize, sensorAngle, isFrontCamera);
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
    this.views.viewfinder.disableZoom();
    return;
  }

  if (this.app.settings.zoom.get('useZoomPreviewAdjustment')) {
    this.views.viewfinder.enableZoomPreviewAdjustment();
  } else {
    this.views.viewfinder.disableZoomPreviewAdjustment();
  }

  var minimumZoom = this.camera.getMinimumZoom();
  var maximumZoom = this.camera.getMaximumZoom();

  this.views.viewfinder.enableZoom(minimumZoom, maximumZoom);
};

/**
 * Updates the zoom level on the camera
 * when the pinch changes.
 *
 * @private
 */
ViewfinderController.prototype.onPinchChanged = function(deltaPinch) {
  var zoom = this.views.viewfinder._zoom *
    (1 + (deltaPinch / this.sensitivity));
  this.views.viewfinder.setZoom(zoom);
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
  this.views.viewfinder.setZoomPreviewAdjustment(zoomPreviewAdjustment);
  this.views.viewfinder.setZoom(zoom);
};

ViewfinderController.prototype.onViewfinderClicked = function(e) {
  if (!this.touchFocusEnabled) {
    return;
  }
  var focusPoint = {
    x: e.pageX,
    y: e.pageY
  };
  focusPoint.area = calculateFocusArea(
    focusPoint.x, focusPoint.y,
    this.views.viewfinder.el.clientWidth,
    this.views.viewfinder.el.clientHeight);
  this.views.focus.changePosition(focusPoint.x, focusPoint.y);
  this.app.emit('viewfinder:focuspointchanged', focusPoint);
};

});