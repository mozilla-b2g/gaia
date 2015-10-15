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
  this.hdrDisabled = this.settings.hdr.get('disabled');
  this.notification = app.views.notification;

  // Wait until we get the battery state before turning
  // on the camera
  this.lowBattery = this.app.get('batteryStatus') === 'shutdown';

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
  camera.on('configured', app.firer('camera:configured'));
  camera.on('requesting', app.firer('camera:requesting'));
  camera.on('change:recording', this.onRecordingChange);
  camera.on('newcamera', app.firer('camera:newcamera'));
  camera.on('newimage', app.firer('camera:newimage'));
  camera.on('newvideo', app.firer('camera:newvideo'));
  camera.on('shutter', app.firer('camera:shutter'));
  camera.on('loaded', app.firer('camera:loaded'));
  camera.on('closed', this.onCameraClosed);
  camera.on('error', app.firer('camera:error'));
  camera.on('ready', app.firer('ready'));
  camera.on('busy', app.firer('busy'));

  // App
  app.on('viewfinder:focuspointchanged', this.onFocusPointChanged);
  app.on('change:batteryStatus', this.onBatteryStatusChange);
  app.on('settings:configured', this.onSettingsConfigured);
  app.on('previewgallery:opened', this.onGalleryOpened);
  app.on('previewgallery:closed', this.onGalleryClosed);
  app.on('stoprecording', this.camera.stopRecording);
  app.on('storage:volumechanged', this.onStorageVolumeChanged);
  app.on('storage:changed', this.onStorageChanged);
  app.on('activity:pick', this.onPickActivity);
  app.on('keydown:capture', this.onCaptureKey);
  app.on('keydown:focus', this.onFocusKey);
  app.on('hidden', this.shutdownCamera);
  app.on('click', this.clearCountdown);
  app.on('visible', this.loadCamera);
  app.on('capture', this.capture);

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

CameraController.prototype.onRecordingChange = function(recording) {
  var active;
  if (recording === 'started') {
    active = true;
  } else if (recording === 'stopped') {
    active = false;
  } else {
    return;
  }
  this.app.set('recording', active);
};

/**
 * Take picture or start/end recording
 * when a capture hardware key is invoked.
 *
 * Calling `.preventDefault()` prevents
 * the default system operation
 * (eg. changing volume level). We
 * only call it when capture request
 * succeeds.
 *
 * We don't want to .preventDefault() when
 * the preview-gallery is open as the
 * user may want to change the volume
 * of a video being played back.
 *
 * @param  {Event} e
 * @private
 */
CameraController.prototype.onCaptureKey = function(e) {
  debug('on capture key', e);
  if (this.capture() !== false) { e.preventDefault(); }
};

/**
 * Focus the camera when a focus
 * hardware key is invoked.
 *
 * @param  {Event} e
 * @private
 */
CameraController.prototype.onFocusKey = function(e) {
  debug('on focus key', e);
  this.camera.focus.focus();
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

  // Defer this work as it involves
  // expensive mozSettings calls
  setTimeout(this.updateZoomForMako);

  debug('camera configured with final settings');
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

CameraController.prototype.capture = function(options = {}) {
  var force = options.force;
  if (!this.shouldCapture()) { return false; }
  if (!force && this.shouldCountdown()) { return this.startCountdown(); }
  if (this.countdown) { return this.clearCountdown(); }
  var position = this.app.geolocation.position;
  return this.camera.capture({ position: position });
};

CameraController.prototype.shouldCapture = function() {
  return !this.app.get('confirmViewVisible') &&
    !this.app.hidden &&
    !this.galleryOpen &&
    !this.lowBattery;
};

CameraController.prototype.shouldCountdown = function() {
  var countdownSet = this.settings.countdown.selected('value');
  var recording = this.app.get('recording');
  return countdownSet &&
    !this.countdown &&
    !recording;
};

CameraController.prototype.startCountdown = function() {
  if (this.countdown) { return; }
  var seconds = this.settings.countdown.selected('value');
  var self = this;

  if (!seconds) { return; }
  this.app.emit('countdown:started', seconds);

  (function scheduleTick() {
    self.countdown = setTimeout(() => {
      if (--seconds <= 0) {
        self.clearCountdown();
        self.capture({ force: true });
        return;
      }

      self.app.emit('countdown:tick', seconds);
      scheduleTick();
    }, 1000);
  })();
};

CameraController.prototype.clearCountdown = function() {
  if (!this.countdown) { return; }
  clearTimeout(this.countdown);
  this.countdown = null;
  this.app.emit('countdown:ended');
};

CameraController.prototype.onFileSizeLimitReached = function() {
  this.camera.stopRecording();
  this.showSizeLimitAlert();
};

CameraController.prototype.showSizeLimitAlert = function() {
  if (this.sizeLimitAlertActive) { return; }
  this.sizeLimitAlertActive = true;
  var alertL10nId = this.activity.pick ?
    'activity-size-limit-reached' :
    'storage-size-limit-reached';
  navigator.mozL10n.formatValue(alertL10nId).then(alert);
  this.sizeLimitAlertActive = false;
};

/**
 * Set the camera's mode (picture/video).
 *
 * We send a signal to say that the camera
 * 'will change', this allows other parts
 * of the app to respond if need be.
 *
 * We then wait for the viewfinder to be 'hidden'
 * before setting the camera to prevent the
 * user from seeing the stream flicker/jump.
 *
 * @param {String} mode ['picture'|'video']
 * @private
 */
CameraController.prototype.setMode = function(mode) {
  debug('set mode: %s', mode);
  var self = this;

  // Abort if didn't change.
  //
  // TODO: Perhaps the `Setting` instance should
  // not emit a `change` event if the value did
  // not change? This may require some deep checking
  // if the value is an object. Quite a risky change
  // to make, but would remove the need for us to check
  // here and in other change callbacks. Food 4 thought :)
  if (this.camera.isMode(mode)) {
    debug('mode didn\'t change');
    return;
  }

  var l10nId = mode == 'video' ? 'Video-Mode' : 'Photo-Mode';
  this.notification.display({ text: l10nId });

  this.setFlashMode();
  this.app.emit('camera:willchange');
  this.app.once('viewfinder:hidden', function() {
    self.camera.setMode(mode);
  });
};

/**
 * Updates the camera's `pictureSize` to match
 * the size set in the app's settings.
 *
 * When in 'picture' mode we send a signal
 * to say that the camera 'will change',
 * this allows other parts of the app to
 * repsond if need be.
 *
 * We then wait for the viewfinder to be hidden
 * before setting the pictureSize to prevent the
 * user from seeing the stream flicker/jump.
 *
 * @private
 */
CameraController.prototype.updatePictureSize = function() {
  debug('update picture-size');
  var pictureMode = this.settings.mode.selected('key') === 'picture';
  var value = this.settings.pictureSizes.selected('data');
  var self = this;

  // Don't do anything if the picture size didn't change
  if (this.camera.isPictureSize(value)) { return; }

  // If not currently in 'picture'
  // mode, just configure.
  if (!pictureMode) {
    this.camera.setPictureSize(value, { configure: false });
    return;
  }

  // Make change once the viewfinder is hidden
  this.app.emit('camera:willchange');
  this.app.once('viewfinder:hidden', function() {
    self.camera.setPictureSize(value);
  });
};

/**
 * Updates the camera's `recorderProfile` to
 * match the size set in the app's settings.
 *
 * When in 'picture' mode we send a signal
 * to say that the camera 'will change',
 * this allows other parts of the app to
 * repsond if need be.
 *
 * We then wait for the viewfinder to be hidden
 * before setting the pictureSize to prevent the
 * user from seeing the stream flicker/jump.
 *
 * @private
 */
CameraController.prototype.updateRecorderProfile = function() {
  debug('update recorder-profile');
  var videoMode = this.settings.mode.selected('key') === 'video';
  var key = this.settings.recorderProfiles.selected('key');
  var self = this;

  // Don't do anything if the recorder-profile didn't change
  if (this.camera.isRecorderProfile(key)) { return; }

  // If not currently in 'video'
  // mode, just configure.
  if (!videoMode) {
    this.camera.setRecorderProfile(key, { configure: false });
    return;
  }

  // Wait for the viewfinder to be hidden
  this.app.emit('camera:willchange');
  this.app.once('viewfinder:hidden', function() {
    self.camera.setRecorderProfile(key);
  });
};

/**
 * Set the selected camera (front/back).
 *
 * We send a signal to say that the camera
 * 'will change', this allows other parts
 * of the app to respond if need be.
 *
 * We then wait for the viewfinder to be 'hidden'
 * before setting the camera to prevent the
 * user from seeing the stream flicker/jump.
 *
 * @param {String} camera ['front'|'back']
 * @private
 */
CameraController.prototype.setCamera = function(camera) {
  debug('set camera: %s', camera);
  var self = this;
  this.app.emit('camera:willchange');
  this.app.once('viewfinder:hidden', function() {
    self.camera.setCamera(camera);
  });
};

/**
 * Sets the flash mode on the camera
 * to match the current flash mode
 * in the app's settings.
 *
 * @private
 */
CameraController.prototype.setFlashMode = function() {
  var flashSetting = this.settings.flashModes;
  this.camera.setFlashMode(flashSetting.selected('key'));
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
  this.lowBattery = status === 'shutdown';
  if (this.lowBattery) { this.shutdownCamera(); }
  else { this.loadCamera(); }
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
CameraController.prototype.onStorageChanged = function(state) {
  if (state !== 'available') {
    this.camera.stopRecording();
  }
};

/**
 * For instance, when the storage volume changes from to internal memory
 * to the SD Card
 *
 * @private
 */
CameraController.prototype.onStorageVolumeChanged = function(storage) {
  this.camera.setStorage(storage);
};

/**
 * Updates focus area when the user clicks on the viewfinder
 */
CameraController.prototype.onFocusPointChanged = function(focusPoint) {
  if (this.countdown) { return; }
  this.camera.updateFocusArea(focusPoint.area);
};

CameraController.prototype.loadCamera = function(showSpinner) {
  if (this.lowBattery || this.galleryOpen || this.app.hidden) {
    return;
  }

  if (showSpinner) { this.app.showSpinner(); }
  this.camera.load();
};

CameraController.prototype.shutdownCamera = function() {
  this.clearCountdown();
  this.camera.shutdown();
};

/**
 * Camera hardware can be closed after a failure or after app request
 * It reboots the application in the case of failure
 *
 * @private
 */
CameraController.prototype.onCameraClosed = function(reason) {
  reason = reason || 'SystemFailure';
  if (reason === 'SystemFailure') {
    this.app.emit('reboot');
  }
};

CameraController.prototype.onGalleryOpened = function() {
  this.galleryOpen = true;
  this.shutdownCamera();
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
CameraController.prototype.onGalleryClosed = function(reason) {
  this.galleryOpen = false;
  if (this.app.hidden) { return; }
  this.loadCamera(true);
};

/**
 * For some reason, the above calculation
 * for `maxHardwareZoom` does not work
 * properly on Mako (Nexus-4) devices.
 *
 * Bug 983930 - [B2G][Camera] CameraControl API's
 * "zoom" attribute doesn't scale preview properly
 *
 * @private
 */
CameraController.prototype.updateZoomForMako = function() {
  debug('update zoom for mako');

  var self = this;
  navigator.mozSettings
    .createLock()
    .get('deviceinfo.hardware')
    .onsuccess = onSuccess;

  debug('settings request made');
  function onSuccess(e) {
    var device = e.target.result['deviceinfo.hardware'];
    if (device !== 'mako') { return; }

    var frontCamera = self.camera.selectedCamera === 'front';
    var maxHardwareZoom = frontCamera ? 1 : 1.25;

    // Nexus 4 needs zoom preview adjustment since the viewfinder preview
    // stream does not automatically reflect the current zoom value.
    self.settings.zoom.set('useZoomPreviewAdjustment', true);
    self.camera.set('maxHardwareZoom', maxHardwareZoom);
    self.camera.emit('zoomconfigured', self.camera.getZoom());
    debug('zoom reconfigured for mako');
  }
};

});
