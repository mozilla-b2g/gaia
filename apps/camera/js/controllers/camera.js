define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('controller:camera');
var performance = require('performanceTesting');
var constants = require('config/camera');
var bindAll = require('utils/bindAll');

/**
 * Locals
 */

var CAMERA = constants.CAMERA_MODE_TYPE.CAMERA;
var proto = CameraController.prototype;

/**
 * Exports
 */

module.exports = CameraController;

function CameraController(app) {
  if (!(this instanceof CameraController)) {
    return new CameraController(app);
  }

  debug('initializing');
  this.viewfinder = app.views.viewfinder;
  this.filmstrip = app.filmstrip;
  this.activity = app.activity;
  this.camera = app.camera;
  this.app = app;

  bindAll(this);
  this.setCaptureMode();
  this.bindEvents();

  // This is old code and should
  // eventually be removed. The
  // activity.js module should be the
  // only place we query about activity.
  if (this.activity.raw) {
    this.camera._pendingPick = this.activity.raw;
  }

  // Not sure what this is for...?
  if ('mozSettings' in navigator) {
    this.camera.getPreferredSizes();
  }

  debug('initialized');
}

proto.bindEvents = function() {
  this.camera.on('recordingstart', this.onRecordingStart);
  this.camera.on('recordingend', this.onRecordingEnd);
  this.camera.on('newimage', this.onNewImage);
  this.camera.on('newvideo', this.onNewVideo);
  this.camera.on('shutter', this.onShutter);
  this.app.on('blur', this.teardownCamera);
  this.app.on('focus', this.setupCamera);
  this.app.on('boot', this.setupCamera);
  debug('events bound');
};

/**
 * Sets the initial
 * capture mode.
 *
 * The mode chosen by an
 * activity is chosen, else
 * we just default to 'camera'
 *
 */
proto.setCaptureMode = function() {
  var initialMode = this.activity.mode || CAMERA;
  this.camera.setCaptureMode(initialMode);
  debug('capture mode set: %s', initialMode);
};

proto.setupCamera = function() {
  this.camera.loadStreamInto(this.viewfinder.el, onStreamLoaded);
  debug('setting up');

  function onStreamLoaded(stream) {
    performance.dispatch('camera-preview-loaded');
    debug('stream loaded %d ms after dom began loading',
          Date.now() - window.performance.timing.domLoading);
  }
};

proto.teardownCamera = function() {
  var recording = this.camera.state.get('recording');
  var camera = this.camera;

  try {
    if (recording) {
      camera.stopRecording();
    }

    this.viewfinder.stopPreview();
    camera.state.set({
      previewActive: false,
      focusState: 'none'
    });
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

proto.onNewImage = function(data) {
  var filmstrip = this.filmstrip;
  var camera = this.camera;
  var blob = data.blob;

  // In either case, save
  // the photo to device storage
  camera._addPictureToStorage(blob, function(name, path) {
    filmstrip.addImageAndShow(path, blob);
    camera.storageCheck();
  });

  if (!this.activity.active) {
    camera.resumePreview();
  }
  debug('new image', data);
};

proto.onNewVideo = function(data) {
  var camera = this.camera;
  var poster = data.poster;
  camera._pictureStorage.addNamed(poster.blob, poster.filename);
  this.filmstrip.addVideoAndShow(data);
  debug('new video', data);
};

/**
 * Plays the 'recordingStart'
 * sound effect.
 *
 */
proto.onRecordingStart = function() {
  this.app.sounds.play('recordingStart');
};

/**
 * Plays the 'recordingEnd'
 * sound effect.
 *
 */
proto.onRecordingEnd = function() {
  this.app.sounds.play('recordingEnd');
};

/**
 * Plays the 'shutter'
 * sound effect.
 *
 */
proto.onShutter = function() {
  this.app.sounds.play('shutter');
};

});
