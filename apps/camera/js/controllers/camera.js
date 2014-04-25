define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('controller:camera');
var bindAll = require('lib/bind-all');

/**
 * Exports
 */

exports = module.exports = function(app) { return new CameraController(app); };
exports.CameraController = CameraController;

/**
 * Initialize a new `CameraController`
 *
 * @param {App} app
 */
function CameraController(app) {
  debug('initializing');
  bindAll(this);
  this.app = app;
  this.camera = app.camera;
  this.settings = app.settings;
  this.activity = app.activity;
  this.viewfinder = app.views.viewfinder;
  this.controls = app.views.controls;
  this.hdrDisabled = this.settings.hdr.get('disabled');
  this.localize = app.localize;
  this.configure();
  this.bindEvents();
  debug('initialized');
}

CameraController.prototype.bindEvents = function() {
  var settings = this.settings;
  var camera = this.camera;
  var app = this.app;

  // Relaying camera events means other modules
  // don't have to depend directly on camera
  camera.on('change:videoElapsed', app.firer('camera:recorderTimeUpdate'));
  camera.on('filesizelimitreached', this.onFileSizeLimitReached);
  camera.on('change:focus', app.firer('camera:focuschanged'));
  camera.on('change:recording', app.setter('recording'));
  camera.on('newcamera', app.firer('camera:newcamera'));
  camera.on('newimage', app.firer('camera:newimage'));
  camera.on('newvideo', app.firer('camera:newvideo'));
  camera.on('shutter', app.firer('camera:shutter'));
  camera.on('configured', this.onCameraConfigured);
  camera.on('loaded', app.firer('camera:loaded'));
  camera.on('ready', app.firer('camera:ready'));
  camera.on('busy', app.firer('camera:busy'));

  // App
  app.on('previewgallery:opened', this.onPreviewGalleryOpened);
  app.on('change:batteryStatus', this.onBatteryStatusChange);
  app.on('settings:configured', this.onSettingsConfigured);
  app.on('storage:changed', this.onStorageChanged);
  app.on('timer:ended', this.capture);
  app.on('visible', this.camera.load);
  app.on('capture', this.capture);
  app.on('hidden', this.onHidden);

  // Settings
  settings.recorderProfiles.on('change:selected', this.onRecorderProfileChange);
  settings.pictureSizes.on('change:selected', this.onPictureSizeChange);
  settings.flashModes.on('change:selected', this.onFlashModeChange);
  settings.flashModes.on('change:selected', this.setFlashMode);
  settings.cameras.on('change:selected', this.setCamera);
  settings.mode.on('change:selected', this.setMode);
  settings.hdr.on('change:selected', this.setHDR);
  settings.hdr.on('change:selected', this.onHDRChange);

  debug('events bound');
};

/**
 * Configure the camera with
 * initial configuration derived
 * from various startup parameters.
 *
 * @private
 */
CameraController.prototype.configure = function() {
  var camera = this.camera;

  // Configure the 'cameras' setting using the
  // cameraList data given by the camera hardware
  this.settings.cameras.filterOptions(camera.cameraList);

  // This is set so that the video recorder can
  // automatically stop when video size limit is reached.
  camera.set('maxFileSizeBytes', this.activity.data.maxFileSizeBytes);
  camera.set('selectedCamera', this.settings.cameras.selected('key'));
  camera.setMode(this.settings.mode.selected('key'));

  // Disable camera config caches when in activity
  // to prevent activity specific configuration persisting.
  if (this.activity.pick) { camera.cacheConfig = false; }

  // Load the camera, passing in a previous
  // mozCameraConfig that may have been
  // retreved from persistent storage.
  camera.load();
  debug('configured');
};

/**
 * Once the settings have finished configuring
 * we do the final camera configuration.
 *
 * @private
 */
CameraController.prototype.onSettingsConfigured = function() {
  var recorderProfile = this.settings.recorderProfiles.selected('key');
  var pictureSize = this.settings.pictureSizes.selected('data');

  this.setWhiteBalance();
  this.setFlashMode();
  this.setISO();
  this.setHDR(this.settings.hdr.selected('key'));
  this.camera
    .setRecorderProfile(recorderProfile)
    .setPictureSize(pictureSize)
    .configureZoom()
    .configure();

  debug('camera configured with final settings');
};

/**
 * Saves the last camera configuration
 * and relays the event through the app.
 *
 * @param  {Object} config
 * @private
 */
CameraController.prototype.onCameraConfigured = function(config) {
  this.app.emit('camera:configured');
};

/**
 * Begins capture, first checking if
 * a countdown timer should be installed.
 *
 * @private
 */
CameraController.prototype.capture = function() {
  if (this.shouldCountdown()) {
    this.app.emit('startcountdown');
    return;
  }

  var position = this.app.geolocation.position;
  this.camera.capture({ position: position });
};

/**
 * Fires a 'startcountdown' event if:
 * A timer settings is set, no timer is
 * already active, and the camera is
 * not currently recording.
 *
 * This event triggers the TimerController
 * to begin counting down, using the TimerView
 * to communicate the remaining seconds.
 *
 * @private
 */
CameraController.prototype.shouldCountdown = function() {
  var timerSet = this.settings.timer.selected('value');
  var timerActive = this.app.get('timerActive');
  var recording = this.app.get('recording');

  return timerSet && !timerActive && !recording;
};

CameraController.prototype.onPictureSizeChange = function() {
  var value = this.settings.pictureSizes.selected('data');
  this.setPictureSize(value);
};

CameraController.prototype.onRecorderProfileChange = function(key) {
  this.setRecorderProfile(key);
};

CameraController.prototype.onFileSizeLimitReached = function() {
  this.camera.stopRecording();
  this.showSizeLimitAlert();
};

CameraController.prototype.showSizeLimitAlert = function() {
  if (this.sizeLimitAlertActive) { return; }
  this.sizeLimitAlertActive = true;
  var alertText = this.activity.pick ?
    'activity-size-limit-reached' :
    'storage-size-limit-reached';
  alert(this.localize(alertText));
  this.sizeLimitAlertActive = false;
};

CameraController.prototype.setMode = function(mode) {
  this.setFlashMode();
  this.camera.setMode(mode);
  this.viewfinder.fadeOut(this.camera.configure);
};

CameraController.prototype.setPictureSize = function(value) {
  var pictureMode = this.settings.mode.selected('key') === 'picture';

  // Only configure in video mode
  this.camera.setPictureSize(value);
  if (pictureMode) { this.viewfinder.fadeOut(this.camera.configure); }
};

CameraController.prototype.setRecorderProfile = function(value) {
  var videoMode = this.settings.mode.selected('key') === 'video';

  // Only configure in video mode
  this.camera.setRecorderProfile(value);
  if (videoMode) { this.viewfinder.fadeOut(this.camera.configure); }
};

CameraController.prototype.setCamera = function(value) {
  this.camera.set('selectedCamera', value);
  this.viewfinder.fadeOut(this.camera.load);
};

CameraController.prototype.setFlashMode = function() {
  var flashSetting = this.settings.flashModes;
  this.camera.setFlashMode(flashSetting.selected('key'));
};

CameraController.prototype.onHidden = function() {
  this.camera.stopRecording();
  this.camera.set('previewActive', false);
  this.camera.set('focus', 'none');
  this.camera.release();
  debug('torn down');
};

CameraController.prototype.setISO = function() {
  if (!this.settings.isoModes.get('disabled')) {
    this.camera.setISOMode(this.settings.isoModes.selected('key'));
  }
};

CameraController.prototype.setWhiteBalance = function() {
  if (!this.settings.whiteBalance.get('disabled')) {
    this.camera.setWhiteBalance(this.settings.whiteBalance.selected('key'));
  }
};

CameraController.prototype.setHDR = function(hdr) {
  if (this.hdrDisabled) { return; }
  this.camera.setHDR(hdr);
};

CameraController.prototype.onFlashModeChange = function(flashModes) {
  if (this.hdrDisabled) { return; }
  var ishdrOn = this.settings.hdr.selected('key') === 'on';
  if (ishdrOn &&  flashModes !== 'off') {
    this.settings.hdr.select('off');
  }
};

CameraController.prototype.onHDRChange = function(hdr) {
  var flashMode = this.settings.flashModesPicture.selected('key');
  var ishdrOn = hdr === 'on';
  if (ishdrOn && flashMode !== 'off') {
    this.settings.flashModesPicture.select('off');
  }
};

CameraController.prototype.onBatteryStatusChange = function(status) {
  if (status === 'shutdown') { this.camera.stopRecording(); }
};

/**
 * Stop recording if storage becomes
 * 'shared' (unavailable) usually due
 * to the device being connected to
 * a computer via USB.
 *
 * @private
 */
CameraController.prototype.onStorageChanged = function(state) {
  if (state === 'shared') { this.camera.stopRecording(); }
};

/**
 * Resets the camera zoom when the preview gallery
 * is opened.
 */
CameraController.prototype.onPreviewGalleryOpened = function() {
  this.camera.configureZoom(this.camera.previewSize());
};

});
