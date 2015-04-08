define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var cameraCoordinates = require('lib/camera-coordinates');
var debug = require('debug')('controller:viewfinder');
var ViewfinderView = require('views/viewfinder');
var FocusView = require('views/focus');
var FacesView = require('views/faces');
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
  bindAll(this);
  this.app = app;
  this.camera = app.camera;
  this.activity = app.activity;
  this.settings = app.settings;
  this.createViews();
  this.bindEvents();
  this.configure();
  debug('initialized');
}

/**
 * Create and inject the views.
 *
 * @private
 */
ViewfinderController.prototype.createViews = function() {
  this.views = {};
  this.views.viewfinder = this.app.views.viewfinder || new ViewfinderView();
  this.views.focus = this.app.views.focus || new FocusView();
  this.views.faces = this.app.views.faces || new FacesView();
  this.views.focus.appendTo(this.views.viewfinder.el);
  this.views.faces.appendTo(this.views.viewfinder.el);
  this.views.viewfinder.appendTo(this.app.el);
};

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

  // View
  this.views.viewfinder.on('fadedin', this.app.firer('viewfinder:visible'));
  this.views.viewfinder.on('fadedout', this.app.firer('viewfinder:hidden'));
  this.views.viewfinder.on('click', this.app.firer('viewfinder:click'));
  this.views.viewfinder.on('click', this.onViewfinderClicked);

  // Tut tut, we shouldn't have direct coupling here.
  // TODO: Camera events should be relayed through the app.
  this.camera.on('zoomconfigured', this.onZoomConfigured);
  this.camera.on('zoomchanged', this.onZoomChanged);
  this.camera.on('preview:started', this.show);

  // Camera
  this.app.on('camera:autofocuschanged', this.views.focus.showAutoFocusRing);
  this.app.on('camera:focusstatechanged', this.views.focus.setFocusState);
  this.app.on('camera:focusconfigured', this.onFocusConfigured);
  this.app.on('camera:shutter', this.views.viewfinder.shutter);
  this.app.on('camera:facesdetected', this.onFacesDetected);
  this.app.on('camera:configured', this.onCameraConfigured);
  this.app.on('camera:previewactive', this.onPreviewActive);
  this.app.on('busy', this.views.viewfinder.disable);
  this.app.on('ready', this.views.viewfinder.enable);
  this.app.on('camera:willchange', this.hide);

  // Preview Gallery
  this.app.on('previewgallery:opened', this.onGalleryOpened);
  this.app.on('previewgallery:closed', this.onGalleryClosed);

  // Settings
  this.app.on('settings:closed', this.onSettingsClosed);
  this.app.on('settings:opened', this.onSettingsOpened);
  this.app.settings.grid.on('change:selected',
    this.views.viewfinder.setter('grid'));

  // App
  this.app.on('pinch:changed', this.onPinchChanged);
  this.app.on('hidden', this.stopStream);
};

/**
 * Perform required viewfinder configuration
 * once the camera has configured.
 *
 * @private
 */
ViewfinderController.prototype.onCameraConfigured = function() {
  debug('configuring');
  this.loadStream();
  this.configurePreview();
};

/**
 * Show the viewfinder.
 *
 * If the critical-path is not done we
 * fade the viewfinder in straight away
 * to make sure we have the quickest
 * startup possible.
 *
 * We have to use a timeout for all other
 * viewfinder showing actions conceal a Gecko
 * rendering bug whereby the video element has
 * not yet 'visually' switched to the new stream
 * when we get the preview 'started' event from
 * the camera. This means the user sees a flicker
 * if we don't give it some time to adjust.
 *
 * We clear these timeouts to avoid multiple pending
 * timeouts, which could cause pain.
 *
 * https://bugzilla.mozilla.org/show_bug.cgi?id=982230
 *
 * @private
 */
ViewfinderController.prototype.show = function() {
  debug('show');
  if (!this.app.criticalPathDone) {
    this.views.viewfinder.fadeIn(1);
    return;
  }

  clearTimeout(this.showTimeout);
  this.showTimeout = setTimeout(this.views.viewfinder.fadeIn, 280);
  debug('schedule delayed fade-in');
};

/**
 * Fades the viewfinder in.
 *
 * We clear any pending timeouts here
 * to prevent unusual behaviour ensuing.
 *
 * @private
 */
ViewfinderController.prototype.hide = function() {
  debug('hide');
  clearTimeout(this.showTimeout);
  this.views.viewfinder.fadeOut();
};

/**
 *  Sets appropiate flags when the camera focus is configured
 */
ViewfinderController.prototype.onFocusConfigured = function(config) {
  this.views.focus.setFocusMode(config.mode);
  this.touchFocusEnabled = config.touchFocus;
  this.views.faces.clear();
  if (config.maxDetectedFaces > 0) {
    this.views.faces.configure(config.maxDetectedFaces);
  }
};

ViewfinderController.prototype.onFacesDetected = function(faces) {
  var self = this;
  var faceCircles = [];
  var viewfinderSize =  this.views.viewfinder.getSize();
  var viewportHeight = viewfinderSize.height;
  var viewportWidth = viewfinderSize.width;
  var sensorAngle = this.camera.getSensorAngle();
  var camera = this.app.settings.cameras.selected('key');
  var isFrontCamera = camera === 'front';

  faces.forEach(function(face, index) {
    // Face comes in camera coordinates from gecko
    var faceInPixels = cameraCoordinates.faceToPixels(
      face.bounds, viewportWidth, viewportHeight, sensorAngle, isFrontCamera);
    var faceCircle = self.calculateFaceCircle(faceInPixels);
    faceCircles.push(faceCircle);
  });
  this.views.faces.show();
  this.views.faces.render(faceCircles);
};

ViewfinderController.prototype.calculateFaceCircle = function(face) {
  var diameter = Math.max(face.width, face.height);
  var radius = diameter / 2;
  return {
    x: Math.round(face.left + face.width / 2 - radius),
    y: Math.round(face.top + face.height / 2 - radius),
    diameter: diameter
  };
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
  if (!this.touchFocusEnabled || this.app.get('timerActive')) {
    return;
  }
  this.views.faces.hide();
  this.changeFocusPoint(e.pageX, e.pageY);
};

ViewfinderController.prototype.changeFocusPoint = function(x, y) {
  var viewfinderSize =  this.views.viewfinder.getSize();
  var viewportHeight = viewfinderSize.height;
  var viewportWidth = viewfinderSize.width;
  var sensorAngle = this.camera.getSensorAngle();
  var focusAreaSize = 10;
  var focusAreaHalfSide = Math.round(focusAreaSize / 2);
  // Top Left corner of the area and its size
  var focusAreaPixels = {
    left: x - focusAreaHalfSide,
    top: y - focusAreaHalfSide,
    right: x + focusAreaHalfSide,
    bottom: y + focusAreaHalfSide,
    width: focusAreaSize,
    height: focusAreaSize
  };
  var camera = this.app.settings.cameras.selected('key');
  var isFrontCamera = camera === 'front';
  var focusArea = cameraCoordinates.faceToCamera(
    focusAreaPixels, viewportWidth, viewportHeight, sensorAngle, isFrontCamera);
  var focusPoint = {
    x: x,
    y: y,
    area: focusArea
  };
  this.views.focus.setPosition(x, y);
  this.app.emit('viewfinder:focuspointchanged', focusPoint);
};

ViewfinderController.prototype.onSettingsOpened = function() {
  this.hideGrid();
  // Make viewfinder invisible to the screen reader since it is behind settings
  // overlay.
  this.views.viewfinder.set('ariaHidden', true);
};

ViewfinderController.prototype.onSettingsClosed = function() {
  this.configureGrid();
  // Make viewfinder visible to the screen reader again when settings are
  // closed.
  this.views.viewfinder.set('ariaHidden', false);
};

/**
 * Disables the viewfinder stream
 * and pinch events.
 *
 * @private
 */
ViewfinderController.prototype.onGalleryOpened = function() {
  this.views.viewfinder.disable();
  // Make viewfinder invisible to the screen reader since it is behind gallery
  // overlay.
  this.views.viewfinder.set('ariaHidden', true);
};

/**
 * Enables the viewfinder stream
 * and pinch events.
 *
 * @private
 */
ViewfinderController.prototype.onGalleryClosed = function() {
  this.views.viewfinder.enable();
  // Make viewfinder visible to the screen reader again when gallery is closed.
  this.views.viewfinder.set('ariaHidden', false);
};

ViewfinderController.prototype.onPreviewActive = function(active) {
  if (!active) {
    this.stopStream();
  }
};

});