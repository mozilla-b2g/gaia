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
  this.storage = app.storage;
  this.settings = app.settings;
  this.activity = app.activity;
  this.filmstrip = app.filmstrip;
  this.viewfinder = app.views.viewfinder;
  this.controls = app.views.controls;
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
  camera.on('change:videoElapsed', app.firer('camera:timeupdate'));
  camera.on('change:capabilities', this.app.setter('capabilities'));
  camera.on('configured', app.firer('camera:configured'));
  camera.on('change:recording', app.setter('recording'));
  camera.on('shutter', app.firer('camera:shutter'));
  camera.on('loaded', app.firer('camera:loaded'));
  camera.on('ready', app.firer('camera:ready'));
  camera.on('busy', app.firer('camera:busy'));

  // Camera
  camera.on('filesizelimitreached', this.onFileSizeLimitReached);
  camera.on('newimage', this.onNewImage);
  camera.on('newvideo', this.onNewVideo);

  // App
  app.on('boot', this.camera.load);
  app.on('focus', this.camera.load);
  app.on('capture', this.onCapture);
  app.on('blur', this.onBlur);
  app.on('settings:configured', this.onSettingsConfigured);
  settings.pictureSizes.on('change:selected', this.onPictureSizeChange);
  settings.recorderProfiles.on('change:selected', this.onRecorderProfileChange);
  settings.flashModes.on('change:selected', this.setFlashMode);
  settings.on('change:cameras', this.loadCamera);
  settings.on('change:mode', this.setMode);
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
  var settings = this.app.settings;
  var activity = this.activity;
  var camera = this.camera;

  // Configure the 'cameras' setting using the
  // cameraList data given by the camera hardware
  settings.cameras.resetOptions(camera.cameraList);

  // Give the camera a way to create video filepaths. This
  // is so that the camera can record videos directly to
  // the final location without us having to move the video
  // file from temporary, to final location at recording end.
  this.camera.createVideoFilepath = this.storage.createVideoFilepath;

  // This is set so that the video recorder can
  // automatically stop when video size limit is reached.
  camera.set('maxFileSizeBytes', activity.data.maxFileSizeBytes);
  camera.set('selectedCamera', settings.cameras.selected('key'));
  camera.setMode(settings.mode.selected('key'));
  debug('configured');
};

CameraController.prototype.onSettingsConfigured = function() {
  var settings = this.app.settings;
  var recorderProfile = settings.recorderProfiles.selected('key');
  var pictureSize = settings.pictureSizes.selected('data');
  this.setFlashMode();
  this.setISO();
  this.camera
    .setRecorderProfile(recorderProfile)
    .setPictureSize(pictureSize)
    .configure();

  debug('camera configured with final settings');

  // TODO: Move to a new StorageController (or App?)
  var maxFileSize = (pictureSize.width * pictureSize.height * 4) + 4096;
  this.storage.setMaxFileSize(maxFileSize);
};


CameraController.prototype.onCapture = function() {
  var position = this.app.geolocation.position;
  this.camera.capture({ position: position });
};

CameraController.prototype.onNewImage = function(image) {
  var filmstrip = this.filmstrip;
  var storage = this.storage;
  var blob = image.blob;
  var self = this;

  // In either case, save
  // the photo to device storage
  storage.addImage(blob, function(filepath) {
    debug('stored image', filepath);
    if (!self.activity.active) {
      filmstrip.addImageAndShow(filepath, blob);
    }
  });

  debug('new image', image);
  this.app.emit('newimage', image);
};

/**
 * Store the poster image,
 * then emit the app 'newvideo'
 * event. This signifies the video
 * fully ready.
 *
 * We don't store the video blob like
 * we do for images, as it is recorded
 * directly to the final location.
 * This is for memory reason.
 *
 * @param  {Object} video
 */
CameraController.prototype.onNewVideo = function(video) {
  debug('new video', video);

  var storage = this.storage;
  var poster = video.poster;

  // Add the video to the filmstrip,
  // then save lazily so as not to block UI
  if (!this.activity.active) {
    this.filmstrip.addVideoAndShow(video);
  }

  // Add the poster image to the image storage
  poster.filepath = video.filepath.replace('.3gp', '.jpg');
  storage.addImage(poster.blob, { filepath: poster.filepath });
  this.app.emit('newvideo', video);
};

CameraController.prototype.onPictureSizeChange = function() {
  var value = this.settings.pictureSizes.selected('data');
  this.setPictureSize(value);
};

CameraController.prototype.onRecorderProfileChange = function() {
  var value = this.settings.recorderProfiles.selected('key');
  this.camera.setRecorderProfile(value);
};

CameraController.prototype.onFileSizeLimitReached = function() {
  this.camera.stopRecording();
  this.showSizeLimitAlert();
};

CameraController.prototype.showSizeLimitAlert = function() {
  if (this.sizeLimitAlertActive) { return; }
  this.sizeLimitAlertActive = true;
  var alertText = this.activity.active ?
    'activity-size-limit-reached' :
    'storage-size-limit-reached';
  alert(navigator.mozL10n.get(alertText));
  this.sizeLimitAlertActive = false;
};

CameraController.prototype.setMode = function(mode) {
  this.setFlashMode();
  this.camera.setMode(mode).configure();
};

CameraController.prototype.setPictureSize = function(value) {
  this.camera.setPictureSize(value).configure();
};

CameraController.prototype.loadCamera = function(value) {
  this.camera.set('selectedCamera', value);
  this.viewfinder.fadeOut(this.camera.load);
};

CameraController.prototype.setFlashMode = function() {
  var flashSetting = this.settings.aliases.flashModes;
  this.camera.setFlashMode(flashSetting.selected('key'));
};

// TODO: Tidy this crap
CameraController.prototype.onBlur = function() {
  var recording = this.camera.get('recording');
  var camera = this.camera;

  try {
    if (recording) {
      camera.stopRecording();
    }

    this.viewfinder.stopPreview();
    camera.set('previewActive', false);
    camera.set('focus', 'none');
    this.viewfinder.setPreviewStream(null);
  } catch (e) {
    console.error('error while stopping preview', e.message);
  } finally {
    camera.release();
  }

  // If the lockscreen is locked
  // then forget everything when closing camera
  if (this.app.inSecureMode) {
    this.filmstrip.clear();
  }

  debug('torn down');
};

CameraController.prototype.setISO = function() {
  if (this.settings.isoModes.get('disabled')) { return; }
  this.camera.setISOMode(this.settings.isoModes.selected('key'));
};

});
