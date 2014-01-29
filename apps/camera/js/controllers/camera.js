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
  var app = this.app;
  var camera = this.camera;
  camera.on('change:recording', app.setter('recording'));
  camera.on('filesizelimitreached', this.onFileSizeLimitReached);
  camera.on('recordingstart', this.onRecordingStart);
  camera.on('recordingend', this.onRecordingEnd);
  camera.on('configured', this.onConfigured);
  camera.on('newimage', this.onNewImage);
  camera.on('newvideo', this.onNewVideo);
  camera.on('shutter', this.onShutter);
  app.on('change:mode', this.onModeChange);
  app.on('change:selectedCamera', this.onCameraChange);
  app.on('change:flashMode', this.onFlashChange);
  app.on('blur', this.teardownCamera);
  app.on('focus', this.setupCamera);
  app.on('boot', this.setupCamera);
  debug('events bound');
};

/**
 * Configure the camera with
 * initial configuration derived
 * from various startup paramenter.
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
 * @return {[type]} [description]
 */
CameraController.prototype.setupCamera = function() {
  this.camera.load();
};

CameraController.prototype.onConfigured = function() {
  var maxFileSize = this.camera.maxPictureSize;
  this.storage.setMaxFileSize(maxFileSize);
  this.app.set('maxFileSize', maxFileSize);
  this.app.set('supports', {
    selectedCamera: this.camera.supports('frontCamera'),
    flashMode: this.camera.supports('flash')
  });

  // TODO: Adjust settings menu contents
  // to reflect new found camera capabilities
  // camera.supports(); //=> ['hdr', 'flash', ...]
  //
  //
  // app.set('cameraSupports', {'hdr': false, 'flash': true })
  //
  // // then in settings controller
  //
  // app.on(change:cameraSupports, funciton(supports) {
  //   var filteredMenuItems = this.config.menu().filter(function(item) { return supports[item.key]; });
  //   this.menuItemsModel.reset(filteredMenuItems);
  // });
  //
  //
  // camera.supports('hdr'); //=> true|false
  // app.emit('change:camerasupports')
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

CameraController.prototype.onModeChange = function(mode) {
  var controls = this.controls;
  var viewfinder = this.viewfinder;
  var camera = this.camera;

  camera.set('mode', mode);
  controls.disableButtons();
  viewfinder.fadeOut(onFadeOut);

  function onFadeOut() {
    camera.loadStreamInto(viewfinder.el, onStreamLoaded);
  }

  function onStreamLoaded() {
    controls.enableButtons();
    viewfinder.fadeIn();
  }
};

/**
 * Toggle the camera (front/back),
 * fading the viewfinder in between.
 */
CameraController.prototype.onCameraChange = function() {
  var controls = this.controls;
  var viewfinder = this.viewfinder;
  var camera = this.camera;

  controls.disableButtons();
  viewfinder.fadeOut(onFadeOut);
  this.app.emit('cameratoggling');

  function onFadeOut() {
    camera.toggleCamera();
  }
};

/**
 * Toggles the flash on
 * the camera and UI when
 * the flash button is pressed.
 *
 */
CameraController.prototype.onFlashChange = function(mode) {
  this.camera.setFlashMode(mode);
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
