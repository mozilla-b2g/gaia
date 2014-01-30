define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('controller:camera');
var constants = require('config/camera');
var bindAll = require('utils/bindAll');

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
  camera.on('configured', app.firer('camera:configured'));
  camera.on('change:recording', app.setter('recording'));
  camera.on('loading', app.firer('camera:loading'));
  camera.on('loaded', app.firer('camera:loaded'));
  camera.on('ready', app.firer('camera:ready'));
  camera.on('busy', app.firer('camera:busy'));

  // Camera
  camera.on('filesizelimitreached', this.onFileSizeLimitReached);
  camera.on('change:recording', this.onRecordingChange);
  camera.on('configured', this.onConfigured);
  camera.on('newimage', this.onNewImage);
  camera.on('newvideo', this.onNewVideo);
  camera.on('shutter', this.onShutter);

  // App
  app.on('change:mode', this.onModeChange);
  app.on('change:selectedCamera', this.onCameraChange);
  app.on('change:flashMode', this.setFlashMode);
  app.on('blur', this.teardownCamera);
  app.on('focus', this.setupCamera);
  app.on('capture', this.onCapture);
  app.on('boot', this.setupCamera);

  // New events i'd like camera to emit
  camera.on('ready', app.firer('camera:ready'));
  camera.on('focusing', app.firer('camera:focusing'));
  camera.on('focusfail', app.firer('camera:focusfail'));

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
  var activity = this.activity;
  var camera = this.camera;
  camera.set('targetFileSize', activity.data.fileSize);
  camera.set('targetImageWidth', activity.data.width);
  camera.set('targetImageHeight', activity.data.height);
  camera.set('selectedCamera', this.app.get('selectedCamera'));
  camera.set('flashMode', this.app.get('flashMode'));
  camera.set('mode', this.app.get('mode'));
  debug('configured');
};

/**
 * Loads the camera with its
 */
CameraController.prototype.setupCamera = function() {
  this.camera.load();
};

CameraController.prototype.onConfigured = function() {
  var maxFileSize = this.camera.maxPictureSize;
  this.storage.setMaxFileSize(maxFileSize);
  this.setFlashMode(this.app.get('flashMode'));
  this.app.set('maxFileSize', maxFileSize);
  this.app.set('supports', {
    selectedCamera: this.camera.supports('dualCamera'),
    flashMode: this.camera.supports('flash')
  });
};

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

  // In either case, save
  // the photo to device storage
  storage.addImage(blob, function(filepath) {
    debug('stored image', filepath);
    filmstrip.addImageAndShow(filepath, blob);
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
  this.filmstrip.addVideoAndShow(video);
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

CameraController.prototype.onModeChange = function(mode) {
  var viewfinder = this.viewfinder;
  var camera = this.camera;

  // We need to force a flash change so that
  // the camera hardware gets set with the
  // correct flash for this capture mode.
  this.setFlashMode(this.app.get('flashMode'));
  camera.set('mode', mode);

  // Fade out the videfinder,
  // then load the stream.
  viewfinder.fadeOut(function() {
    camera.loadStreamInto(viewfinder.el);
  });
};

/**
 * Toggle the camera (front/back),
 * fading the viewfinder in between.
 */
CameraController.prototype.onCameraChange = function() {
  this.viewfinder.fadeOut(this.camera.toggleCamera);
};

/**
 * Toggles the flash on
 * the camera and UI when
 * the flash button is pressed.
 *
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
  var isPhotoMode = this.app.get('mode') === 'photo';
  if (isPhotoMode) { return flashMode; }
  if (isFrontCamera) { return null; }
  switch (flashMode) {
    case 'auto': return 'off';
    case 'on': return 'torch';
    default: return flashMode;
  }
};

/**
 * Plays the 'recordingStart'
 * or `recordingEnd` sound effect.
 *
 * TODO: Move sounds into a sounds controller
 */
CameraController.prototype.onRecordingChange = function(recording) {
  if (recording) { this.app.sounds.play('recordingStart'); }
  else { this.app.sounds.play('recordingEnd'); }
};

/**
 * Plays the 'shutter'
 * sound effect.
 */
CameraController.prototype.onShutter = function() {
  this.app.sounds.play('shutter');
};

});
