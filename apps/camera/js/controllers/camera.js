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

module.exports = function(app) { return new CameraController(app); };
module.exports.CameraController = CameraController;

/**
 * Initialize a new `CameraController`
 *
 * @param {App} app
 */
function CameraController(app) {
  bindAll(this);
  this.app = app;
  this.camera = app.camera;
  this.settings = app.settings;
  this.activity = app.activity;
  this.viewfinder = app.views.viewfinder;
  this.controls = app.views.controls;
  this.hdrDisabled = this.settings.hdr.get('disabled');
  this.l10nGet = app.l10nGet;
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
  camera.on('change:previewActive', this.app.firer('camera:previewactive'));
  camera.on('change:videoElapsed', app.firer('camera:recorderTimeUpdate'));
  camera.on('autofocuschanged', app.firer('camera:autofocuschanged'));
  camera.on('focusconfigured',  app.firer('camera:focusconfigured'));
  camera.on('change:focus', app.firer('camera:focusstatechanged'));
  camera.on('filesizelimitreached', this.onFileSizeLimitReached);
  camera.on('facesdetected', app.firer('camera:facesdetected'));
  camera.on('willrecord', app.firer('camera:willrecord'));
  camera.on('change:recording', app.setter('recording'));
  camera.on('newcamera', app.firer('camera:newcamera'));
  camera.on('newimage', app.firer('camera:newimage'));
  camera.on('newvideo', app.firer('camera:newvideo'));
  camera.on('shutter', app.firer('camera:shutter'));
  camera.on('configured', this.onCameraConfigured);
  camera.on('loaded', app.firer('camera:loaded'));
  camera.on('ready', app.firer('ready'));
  camera.on('busy', app.firer('busy'));

  // App
  app.on('viewfinder:focuspointchanged', this.onFocusPointChanged);
  app.on('change:batteryStatus', this.onBatteryStatusChange);
  app.on('settings:configured', this.onSettingsConfigured);
  app.on('previewgallery:opened', this.shutdownCamera);
  app.on('previewgallery:closed', this.onGalleryClosed);
  app.on('storage:changed', this.onStorageChanged);
  app.on('storage:volumechanged', this.onStorageVolumeChanged);
  app.on('activity:pick', this.onPickActivity);
  app.on('timer:ended', this.capture);
  app.on('visible', this.camera.load);
  app.on('capture', this.capture);
  app.on('hidden', this.onHidden);
  app.on('attentionscreenopened', this.camera.stopRecording);

  // Settings
  settings.recorderProfiles.on('change:selected', this.updateRecorderProfile);
  settings.pictureSizes.on('change:selected', this.updatePictureSize);
  settings.flashModes.on('change:selected', this.onFlashModeChange);
  settings.flashModes.on('change:selected', this.setFlashMode);
  settings.cameras.on('change:selected', this.setCamera);
  settings.mode.on('change:selected', this.setMode);
  settings.hdr.on('change:selected', this.setHDR);
  settings.hdr.on('change:selected', this.onHDRChange);

  debug('events bound');
};

/**
 * Configure the 'cameras' setting using the
 * `cameraList` data given by the camera hardware
 *
 * @private
 */
CameraController.prototype.configure = function() {
  this.settings.cameras.filterOptions(this.camera.cameraList);
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
  this.setHDR();

  this.camera.setRecorderProfile(recorderProfile);
  this.camera.setPictureSize(pictureSize);
  this.camera.configureZoom();

  // Bug 983930 - [B2G][Camera] CameraControl API's "zoom" attribute doesn't
  // scale preview properly
  //
  // For some reason, the above calculation for `maxHardwareZoom` does not
  // work properly on Nexus 4 devices.
  var hardware = navigator.mozSettings.createLock().get('deviceinfo.hardware');
  var self = this;
  hardware.onsuccess = function(evt) {
    var device = evt.target.result['deviceinfo.hardware'];
    if (device === 'mako') {

      // Nexus 4 needs zoom preview adjustment since the viewfinder preview
      // stream does not automatically reflect the current zoom value.
      self.settings.zoom.set('useZoomPreviewAdjustment', true);

      if (self.camera.selectedCamera === 'front') {
        self.camera.set('maxHardwareZoom', 1);
      } else {
        self.camera.set('maxHardwareZoom', 1.25);
      }

      self.camera.emit('zoomconfigured');
    }
  };

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
 * Updates camera configuration in
 * response to pick activity parameters.
 *
 * @param  {Object} data
 * @private
 */
CameraController.prototype.onPickActivity = function(data) {

  // This is set so that the video recorder can
  // automatically stop when video size limit is reached.
  this.camera.set('maxFileSizeBytes', data.maxFileSizeBytes);

  // Disable camera config caches when in 'pick' activity
  // to prevent activity specific configuration persisting.
  this.camera.cacheConfig = false;
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
  alert(this.l10nGet(alertText));
  this.sizeLimitAlertActive = false;
};

CameraController.prototype.setMode = function(mode) {
  var self = this;
  this.setFlashMode();
  this.viewfinder.fadeOut(function() {
    self.camera.setMode(mode);
  });
};

CameraController.prototype.updatePictureSize = function() {
  var pictureMode = this.settings.mode.selected('key') === 'picture';
  var value = this.settings.pictureSizes.selected('data');
  var self = this;

  // Only configure in video mode
  if (!pictureMode) {
    this.camera.setPictureSize(value, { configure: false });
    return;
  }

  // Fade out, then configure
  this.viewfinder.fadeOut(function() {
    self.camera.setPictureSize(value);
  });
};

CameraController.prototype.updateRecorderProfile = function() {
  var videoMode = this.settings.mode.selected('key') === 'video';
  var key = this.settings.recorderProfiles.selected('key');
  var self = this;

  // Only configure in picture mode
  if (!videoMode) {
    this.camera.setRecorderProfile(key, { configure: false });
    return;
  }

  // Fade out, then change the setting
  this.viewfinder.fadeOut(function() {
    self.camera.setRecorderProfile(key);
  });
};

/**
 * Set the 'selected' camera.
 *
 * @param {String} camera 'front'|'back'
 */
CameraController.prototype.setCamera = function(camera) {
  var self = this;
  this.viewfinder.fadeOut(function() {
    self.camera.setCamera(camera);
  });
};

CameraController.prototype.setFlashMode = function() {
  var flashSetting = this.settings.flashModes;
  this.camera.setFlashMode(flashSetting.selected('key'));
};

CameraController.prototype.onHidden = function() {
  debug('app hidden');
  this.camera.stopRecording();
  this.camera.set('focus', 'none');
  this.camera.release();
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

CameraController.prototype.setHDR = function() {
  if (this.hdrDisabled) { return; }
  this.camera.setHDR(this.settings.hdr.selected('key'));
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
 * Stop recording if storage changes state.
 * Examples:
 * 'shared' usually due to the device being connected to
 *  a computer via USB.
 * 'unavailable' when the SDCARD is yanked
 *
 * @private
 */
CameraController.prototype.onStorageChanged = function() {
  this.camera.stopRecording();
};

/**
 * For instance, when the storage volume changes from to internal memory
 * to the SD Card
 *
 * @private
 */
CameraController.prototype.onStorageVolumeChanged = function(storage) {
  this.camera.setVideoStorage(storage.video);
};

/**
 * Updates focus area when the user clicks on the viewfinder
 */
CameraController.prototype.onFocusPointChanged = function(focusPoint) {
  this.camera.updateFocusArea(focusPoint.area);
};

CameraController.prototype.shutdownCamera = function() {
  this.camera.stopRecording();
  this.camera.set('previewActive', false);
  this.camera.set('focus', 'none');
  this.camera.release();
};

/**
 * As the camera is shutdown when the
 * preview gallery is opened, we must
 * reload it when it is closed.
 *
 * Although if the app is has been minimised
 * we do not want to reload the camera as
 * the hardware must be released when the
 * app is not visible.
 *
 * @private
 */
CameraController.prototype.onGalleryClosed = function() {
  if (this.app.hidden) {
    return;
  }

  this.app.showLoading();
  this.camera.load(this.app.onReady);
};

});