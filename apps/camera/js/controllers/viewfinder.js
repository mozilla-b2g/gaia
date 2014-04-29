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
  this.focusRing = this.viewfinder.focusRing;
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
  this.viewfinder.on('pinchChange', this.onPinchChange);
  this.camera.on('zoomchanged', this.onZoomChanged);
  this.app.on('camera:shutter', this.onShutter);
  this.app.on('camera:focuschanged', this.focusRing.setState);
  this.app.on('camera:configured', this.onCameraConfigured);
  this.app.on('previewgallery:closed', this.onPreviewGalleryClosed);
  this.app.on('previewgallery:opened', this.stopStream);
  this.app.on('settings:closed', this.configureGrid);
  this.app.on('settings:opened', this.hideGrid);
  this.app.on('hidden', this.stopStream);
  // moved to a focusRing controller
  this.camera.on('change:focus', this.onFocusChange);
  // moved to a focusRing controller
  this.camera.on('change:focusMode', this.onFocusModeChange);
  //Focus facetracking
  this.camera.on('facedetected', this.onFacedetected);
  this.camera.on('nofacedetected', this.camera.setDefaultFocusmode);
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
  this.viewfinder.setFocusRingDafaultPotion();
};

ViewfinderController.prototype.onShutter = function() {
  this.focusRing.setState('none');
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
ViewfinderController.prototype.onZoomChanged = function(zoom) {
  var zoomPreviewAdjustment = this.camera.getZoomPreviewAdjustment();
  this.viewfinder.setZoomPreviewAdjustment(zoomPreviewAdjustment);
  this.viewfinder.setZoom(zoom);
};

ViewfinderController.prototype.onFocusChange = function(value) {
  this.focusRing.setState(value);
  if (this.focusTimeout) {
    clearTimeout(this.focusTimeout);
    this.focusTimeout = null;
  }
  var self = this;
    if (value === 'fail') {
      this.focusTimeout = setTimeout(function() {
        self.focusRing.setState(null);
      }, 1000);
    }
  };

ViewfinderController.prototype.onFocusModeChange = function(value) {
  this.focusRing.setMode(value);
  if (value === 'continuousFocus') {
    this.viewfinder.setFocusRingDafaultPotion();
  }
  this.faceFocusTimeout = false;
};


ViewfinderController.prototype.onFacedetected = function(faces) {
  if (!this.camera.focusModes.faceTracking ||
     this.faceFocusTimeout) { return ;}
  this.clearFocusTimeOut();
  this.camera.set('focus', 'none');
  this.faceFocusTimeout = true;
  this.viewfinder.clearFaceRings();
  var calFaces = this.calculateFaceBounderies(faces);
  if (calFaces.mainFace) {
    this.viewfinder.setMainFace(calFaces.mainFace);
  }
  var otherFaces = calFaces.otherFaces;
  for(var i in otherFaces) {
    this.viewfinder.setOtherFaces(otherFaces[i]);
  }
  this.camera.onFacedetected(faces[calFaces.mainFace.index],focusDone);
  var self = this;
  function focusDone() {
    self.clearFocusTimeOut();
    setTimeout(function() {
      self.camera.set('focus', 'none');
        self.faceFocusTimeout = false;
        self.viewfinder.clearFaceRings();
        self.setFocusTimeOut();
    }, 3000);
  }
  this.setFocusTimeOut();
};

ViewfinderController.prototype.calculateFaceBounderies = function(faces) {
  var scaling = {
    width: this.viewfinder.els.frame.clientWidth / 2000,
    height: this.viewfinder.els.frame.clientHeight / 2000
  };
  var minFaceScore = 20;
  var maxID = -1;
  var maxArea = 0;
  var area = 0;
  var transformedFaces = [];
  var mainFace = null;

  for (var i = 0; i < faces.length; i++) {
    if (faces[i].score < minFaceScore) {
      continue;
    }
    area = faces[i].bounds.width * faces[i].bounds.height;
    var radius = Math.round(Math.max(faces[i].bounds.height,
      faces[i].bounds.width) * scaling.width);
    var errFactor = Math.round(radius / 2);
    var px = Math.round((faces[i].bounds.left +
      faces[i].bounds.right)/2 * scaling.height) - errFactor;
    var py = Math.round((-1) * ((faces[i].bounds.top +
      faces[i].bounds.bottom)/2) * scaling.width) - errFactor;
     transformedFaces[i] = {
      pointX: px,
      pointY: py,
      length: radius,
      index: i
    };
    if (area > maxArea) {
      maxArea = area;
      maxID = i;
      mainFace = transformedFaces[i];
    }
  }
  // remove maximum area face from the array.
  if (maxID > -1) {
    transformedFaces.splice(maxID, 1);
  }
  return {
    mainFace: mainFace,
    otherFaces: transformedFaces
  };
};

ViewfinderController.prototype.setFocusTimeOut = function() {
  var self = this;
  this.focusRingTimeOut = setTimeout(function() {
    self.camera.set('focus', 'none');
    self.faceFocusTimeout = false;
    self.viewfinder.clearFaceRings();
    self.camera.setDefaultFocusmode();
  }, 3000);
};

ViewfinderController.prototype.clearFocusTimeOut = function () {
  if (this.focusRingTimeOut) {
    clearTimeout(this.focusRingTimeOut);
    this.focusRingTimeOut = null;
  }
};

ViewfinderController.prototype.clearFocusRing = function () {
  this.camera.set('focus', 'none');
  this.clearFocusTimeOut();
};
});
