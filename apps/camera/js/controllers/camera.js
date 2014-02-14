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
  this.storage = app.storage;
  this.activity = app.activity;
  this.filmstrip = app.filmstrip;
  this.viewfinder = app.views.viewfinder;
  this.controls = app.views.controls;
  this.configure();
  this.bindEvents();
  debug('initialized');
}

CameraController.prototype.bindEvents = function() {
  var camera = this.camera;
  var app = this.app;

  // Relaying camera events means other modules
  // don't have to depend directly on camera
  camera.on('change:videoElapsed', app.firer('camera:timeupdate'));
  camera.on('configured', this.app.setter('capabilities'));
  camera.on('configured', app.firer('camera:configured'));
  camera.on('change:recording', app.setter('recording'));
  camera.on('loading', app.firer('camera:loading'));
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
  app.on('blur', this.teardownCamera);
  app.on('settings:configured', this.onSettingsConfigured);
  app.settings.on('change:pictureSizes', this.camera.setPictureSize);
  app.settings.on('change:flashModes', this.setFlashMode);
  app.settings.on('change:cameras', this.loadCamera);
  app.settings.on('change:mode', this.setMode);
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
  settings.get('cameras').configureOptions(camera.cameraList);

  // This is set so that the video recorder can
  // automatically stop when video size limit is reached.
  camera.set('maxFileSizeBytes', activity.data.maxFileSizeBytes);
  camera.set('selectedCamera', settings.value('cameras'));
  camera.setMode(settings.value('mode'));
  debug('configured');
};

CameraController.prototype.onSettingsConfigured = function() {
  var recorderProfile = this.app.settings.recorderProfiles.selected().key;
  this.camera.setPictureSize(this.app.settings.value('pictureSizes'));
  this.camera.setVideoProfile(recorderProfile);
  this.camera.setFlashMode(this.app.settings.value('flashModes'));
  debug('camera configured with final settings');

  // TODO: Move to a new StorageController (or App?)
  var pictureSize = this.app.settings.pictureSizes.value();
  var maxFileSize = (pictureSize.width * pictureSize.height * 4) + 4096;
  this.storage.setMaxFileSize(maxFileSize);
};

// TODO: Tidy this crap
CameraController.prototype.teardownCamera = function() {
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

CameraController.prototype.onNewVideo = function(video) {
  debug('new video', video);

  var storage = this.storage;
  var poster = video.poster;
  var camera = this.camera;
  var tmpBlob = video.blob;
  var app = this.app;

  // Add the video to the filmstrip,
  // then save lazily so as not to block UI
  if (!this.activity.active) {
    this.filmstrip.addVideoAndShow(video);
  }
  storage.addVideo(tmpBlob, function(blob, filepath) {
    debug('stored video', filepath);
    video.filepath = filepath;
    video.blob = blob;

    // Add the poster image to the image storage
    poster.filepath = video.filepath.replace('.3gp', '.jpg');
    storage.addImage(poster.blob, { filepath: poster.filepath });

    // Now we have stored the blob
    // we can delete the temporary one.
    // NOTE: If we could 'move' the temp
    // file it would be a lot better.
    camera.deleteTmpVideoFile();
    app.emit('newvideo', video);
  });
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
  var flashMode = this.app.settings.value('flashMode');
  var self = this;
  // We need to force a flash change so that
  // the camera hardware gets set with the
  // correct flash for this capture mode.
  this.setFlashMode(flashMode);
  this.viewfinder.fadeOut(function() {
    self.camera.setMode(mode);
  });
};

CameraController.prototype.loadCamera = function(value) {
  this.camera.set('selectedCamera', value);
  this.viewfinder.fadeOut(this.camera.load);
};

/**
 * Toggles the flash on
 * the camera and UI when
 * the flash button is pressed.
 */
CameraController.prototype.setFlashMode = function(flashMode) {
  flashMode = this.translateFlashMode(flashMode);
  this.camera.setFlashMode(flashMode);
};

/**
 * This is a quick fix to translate
 * the chosen flash mode into a video
 * compatible flash mode.
 *
 * The reason being, camera will soon
 * be dual shutter and both camera
 * and video will support the same
 * flash options. We don't want to
 * waste time building support for
 * deprecated functionality.
 *
 * @param  {String} flashMode
 * @return {String}
 */
CameraController.prototype.translateFlashMode = function(flashMode) {
  var isFrontCamera = this.app.get('selectedCamera') === 1;
  var isPhotoMode = this.app.settings.value('mode') === 'picture';
  if (isPhotoMode) { return flashMode; }
  if (isFrontCamera) { return null; }
  switch (flashMode) {
    case 'auto': return 'off';
    case 'on': return 'torch';
    default: return flashMode;
  }
};

});
