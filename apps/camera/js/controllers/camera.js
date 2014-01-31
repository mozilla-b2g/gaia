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

module.exports = function(app) {
  return new CameraController(app);
};

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
  this.activity = app.activity;
  this.filmstrip = app.filmstrip;
  this.viewfinder = app.views.viewfinder;
  this.initialConfiguration();
  this.bindEvents();
  debug('initialized');
}

CameraController.prototype.bindEvents = function() {
  this.camera.on('filesizelimitreached', this.onFileSizeLimitReached);
  this.camera.on('recordingstart', this.onRecordingStart);
  this.camera.on('recordingend', this.onRecordingEnd);
  this.camera.on('configured', this.onConfigured);
  this.camera.on('newimage', this.onNewImage);
  this.camera.on('newvideo', this.onNewVideo);
  this.camera.on('shutter', this.onShutter);
  this.app.on('blur', this.teardownCamera);
  this.app.on('focus', this.setupCamera);
  this.app.on('boot', this.setupCamera);
  debug('events bound');
};

/**
 * Configure the camera with
 * initial configuration derived
 * from various startup paramenter.
 *
 * @private
 */
CameraController.prototype.initialConfiguration = function() {
  debug('initial configuration');

  var initialMode = this.activity.mode || 'photo';
  var activity = this.activity;
  var camera = this.camera;

  camera.set('targetFileSize', activity.data.fileSize);
  camera.set('targetImageWidth', activity.data.width);
  camera.set('targetImageHeight', activity.data.height);
  camera.set('mode', initialMode);
};

/**
 * Loads the camera with its
 * @return {[type]} [description]
 */
CameraController.prototype.setupCamera = function() {
  this.camera.load();
};

CameraController.prototype.onConfigured = function() {
  var maxFileSize = this.camera.maxPictureSize;
  this.storage.setMaxFileSize(maxFileSize);
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

/**
 * Plays the 'recordingStart'
 * sound effect.
 *
 */
CameraController.prototype.onRecordingStart = function() {
  this.app.sounds.play('recordingStart');
};

/**
 * Plays the 'recordingEnd'
 * sound effect.
 *
 */
CameraController.prototype.onRecordingEnd = function() {
  this.app.sounds.play('recordingEnd');
};

/**
 * Plays the 'shutter'
 * sound effect.
 *
 */
CameraController.prototype.onShutter = function() {
  this.app.sounds.play('shutter');
};

});
