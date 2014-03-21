define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('controller:camera');
var bindAll = require('lib/bind-all');
var parseJPEGMetadata = require('jpegMetaDataParser');
var createThumbnailImage = require('lib/create-thumbnail-image');

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
  this.viewfinder = app.views.viewfinder;
  this.controls = app.views.controls;
  this.hdrDisabled = this.settings.hdr.get('disabled');
  this.configure();
  this.bindEvents();
  /**
    Default Thumbnail sizes in css pixels
  */
  this.thumbnailWidth = 54;
  this.thumbnailHeight = 54;
  debug('initialized');
}

CameraController.prototype.bindEvents = function() {
  var settings = this.settings;
  var camera = this.camera;
  var app = this.app;

  // Relaying camera events means other modules
  // don't have to depend directly on camera
  camera.on('change:videoElapsed', app.firer('camera:recorderTimeUpdate'));
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
  app.on('capture', this.capture);
  app.on('timer:ended', this.capture);
  app.on('blur', this.onBlur);
  app.on('settings:configured', this.onSettingsConfigured);
  settings.pictureSizes.on('change:selected', this.onPictureSizeChange);
  settings.recorderProfiles.on('change:selected', this.onRecorderProfileChange);
  settings.flashModes.on('change:selected', this.setFlashMode);
  settings.flashModes.on('change:selected', this.onFlashModeChange);
  settings.on('change:cameras', this.loadCamera);
  settings.on('change:mode', this.setMode);
  settings.on('change:hdr', this.setHDR);
  settings.on('change:hdr', this.onHDRChange);
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
  this.setWhiteBalance();
  this.setFlashMode();
  this.setISO();
  this.setHDR(this.settings.hdr.selected('key'));
  this.camera
    .setRecorderProfile(recorderProfile)
    .setPictureSize(pictureSize)
    .configure();

  debug('camera configured with final settings');

  // TODO: Move to a new StorageController (or App?)
  var maxFileSize = (pictureSize.width * pictureSize.height * 4) + 4096;
  this.storage.setMaxFileSize(maxFileSize);
};

/**
 * Begins capture, first checking if
 * a countdown timer should be installed.
 *
 * @return {[type]} [description]
 */
 CameraController.prototype.capture = function() {
  if (this.shouldCountdown()) { return; }
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
  var shouldCountdown = timerSet && !timerActive && !recording;
  debug('should countdown: %s', shouldCountdown);
  if (shouldCountdown) {
    this.app.emit('startcountdown');
    return true;
  }
};

CameraController.prototype.onNewImage = function(image) {
  var storage = this.storage;
  var memoryBlob = image.blob;
  var self = this;

  // In either case, save the memory-backed photo blob to
  // device storage, retrieve the resulting File (blob) and
  // pass that around instead of the original memory blob.
  // This is critical for "pick" activity consumers where
  // the memory-backed Blob is either highly inefficent or
  // will almost-immediately become inaccesible, depending
  // on the state of the platform. https://bugzil.la/982779
  storage.addImage(
    memoryBlob,
    function(filepath, abspath, fileBlob) {
      debug('stored image', filepath);
      image.blob = fileBlob;
      if (!self.activity.active) {
        image.filepath = filepath;
        self.createThumbnail(image, onThumbnailCreated);
      }

      debug('new image', image);
      self.app.emit('newimage', image);
    }.bind(this));

  function onThumbnailCreated(thumbnailBlob) {
    self.app.emit('newthumbnail', thumbnailBlob);
    image.thumbnail = thumbnailBlob;
    self.app.emit('newmedia', image);
  }
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
  video.isVideo = true;

  // Add the poster image to the image storage
  poster.filepath = video.filepath.replace('.3gp', '.jpg');

  storage.addImage(
    poster.blob, { filepath: poster.filepath },
    function(path, absolutePath, fileBlob) {
      // Replace the memory-backed Blob with the DeviceStorage file-backed File.
      // Note that "video" references "poster", so video previews will use this
      // File.
      poster.blob = fileBlob;
      this.app.emit('newvideo', video);
    }.bind(this));

  this.createThumbnail(video, onThumbnailCreated);

  function onThumbnailCreated(thumbnailBlob) {
    self.app.emit('newthumbnail', thumbnailBlob);
    video.thumbnail = thumbnailBlob;
    self.app.emit('newmedia', video);
  }
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
  this.camera.setMode(mode);
  this.viewfinder.fadeOut(this.camera.configure);
};

CameraController.prototype.setPictureSize = function(value) {
  this.camera.setPictureSize(value);
  this.viewfinder.fadeOut(this.camera.configure);
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

CameraController.prototype.createThumbnail = function(media,
                                                      onThumbnailCreated) {
  var thumbnailWidth = this.thumbnailWidth * window.devicePixelRatio;
  var thumbnailHeight = this.thumbnailHeight * window.devicePixelRatio;

  if (media.isVideo) {
    createThumbnailImage(
      media.poster.blob,
      thumbnailWidth,
      thumbnailHeight,
      media.isVideo,
      false,
      media.mirrored,
      onThumbnailCreated);
  } else {
    parseJPEGMetadata(media.blob, onJPEGParsed);
  }

  function onJPEGParsed(metadata) {
    var blob = media.blob;
    // If JPEG contains a preview we use it to create the thumbnail
    if (metadata.preview) {
      blob = blob.slice(
        metadata.preview.start,
        metadata.preview.end,
        'image/jpeg');
    }
    createThumbnailImage(
      blob,
      thumbnailWidth,
      thumbnailHeight,
      false,
      metadata.rotation,
      metadata.mirrored,
      onThumbnailCreated);
  }
};

});
