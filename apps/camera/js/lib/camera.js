define(function(require, exports, module) {
'use strict';

/**
 * Module Dependencies
 */

var CameraUtils = require('lib/camera-utils');
var getVideoMetaData = require('lib/get-video-meta-data');
var orientation = require('lib/orientation');
var constants = require('config/camera');
var debug = require('debug')('camera');
var bindAll = require('lib/bind-all');
var model = require('vendor/model');

/**
 * Locals
 */

var recordSpaceMin = constants.RECORD_SPACE_MIN;
var recordSpacePadding = constants.RECORD_SPACE_PADDING;

/**
 * Locals
 */

// Mixin model methods (also events)
model(Camera.prototype);

/**
 * Exports
 */

module.exports = Camera;

/**
 * Initialize a new 'Camera'
 *
 * Options:
 *
 *   - {Element} container
 *
 * @param {Object} options
 */
function Camera(options) {
  debug('initializing');
  bindAll(this);
  options = options || {};
  this.container = options.container;
  this.mozCamera = null;
  this.cameraList = navigator.mozCameras.getListOfCameras();
  this.orientation = options.orientation || orientation;
  this.autoFocus = {};
  this.video = {
    storage: navigator.getDeviceStorage('videos'),
    filepath: null,
    minSpace: options.recordSpaceMin || recordSpaceMin,
    spacePadding : options.recordSpacePadding || recordSpacePadding
  };
  debug('initialized');
}

/**
 * Plugs Video Stream into Video Element.
 *
 * @param  {Elmement} videoElement
 */
Camera.prototype.loadStreamInto = function(videoElement) {
  debug('loading stream into element');
  if (!this.mozCamera) {
    debug('error - `mozCamera` is undefined or null');
    return;
  }

  if (!videoElement) {
    debug('error - `videoElement` is undefined or null');
    return;
  }

  // Don't load the same camera stream again
  var isCurrent = videoElement.mozSrcObject === this.mozCamera;
  if (isCurrent) { return debug('camera didn\'t change'); }

  videoElement.mozSrcObject = this.mozCamera;
  videoElement.play();
  debug('stream loaded into video');
};

Camera.prototype.load = function() {
  debug('load camera');

  // If hardware is still pending for release
  // we're not allowed to request a new caemera
  if (this.cameraReleasePending) {
    debug('camera not loaded: hardware unavailable');
    return;
  }
  var selectedCamera = this.get('selectedCamera');
  var loadingNewCamera = selectedCamera !== this.lastLoadedCamera;
  this.lastLoadedCamera = selectedCamera;
  this.emit('busy');

  if (this.mozCamera && !loadingNewCamera) {
    this.gotCamera(this.mozCamera);
    return;
  }

  // If a camera is already loaded,
  // it must be 'released' first.
  if (this.mozCamera) { this.release(this.requestCamera); }
  else { this.requestCamera(); }
};

Camera.prototype.requestCamera = function() {
  var selectedCamera = this.get('selectedCamera');
  navigator.mozCameras.getCamera(selectedCamera, {}, this.gotCamera);
};

Camera.prototype.gotCamera = function(mozCamera) {
  debug('got camera');
  var capabilities = mozCamera.capabilities;
  this.mozCamera = mozCamera;
  this.mozCamera.onShutter = this.onShutter;
  this.mozCamera.onPreviewStateChange = this.onPreviewStateChange;
  this.mozCamera.onRecorderStateChange = this.onRecorderStateChange;
  this.configureFocus(capabilities.focusModes);
  this.set('capabilities', this.formatCapabilities(capabilities));
};

Camera.prototype.formatCapabilities = function(capabilities) {
  var hasHDR = capabilities.sceneModes.indexOf('hdr') > -1;
  capabilities.hdr = hasHDR ? ['on', 'off'] : undefined;
  return capabilities;
};

Camera.prototype.configure = function() {
  var self = this;
  var success = function() {
    self.emit('configured');
  };

  var error = function() {
    console.log('Error configuring camera');
  };

  var previewSize = this.previewSize();
  var options = {
    mode: this.mode,
    previewSize: previewSize,
    recorderProfile: this.recorderProfile.key
  };

  debug('mozCamera configuration pw: %s, ph: %s',
    options.previewSize.width,
    options.previewSize.height);

  this.mozCamera.setConfiguration(options, success, error);
  this.configureZoom(previewSize);
};

Camera.prototype.previewSizes = function() {
  return this.mozCamera.capabilities.previewSizes;
};

Camera.prototype.previewSize = function() {
  var sizes = this.previewSizes();
  var profile = this.resolution();
  var size = CameraUtils.getOptimalPreviewSize(sizes, profile);
  debug('resolution w: %s, h: %s', profile.width, profile.height);
  debug('previewSize w: %s, h: %s', size.width, size.height);
  return size;
};

Camera.prototype.resolution = function(mode) {
  switch (mode || this.mode) {
    case 'picture': return this.pictureSize;
    case 'video': return this.recorderProfile.video;
  }
};

Camera.prototype.setPictureSize = function(value) {
  this.mozCamera.pictureSize = this.pictureSize = value;
  this.setThumbnailSize();
  debug('set picture size w: %s, h: %s', value.width, value.height);
  return this;
};

Camera.prototype.setThumbnailSize = function() {
  var sizes = this.mozCamera.capabilities.thumbnailSizes;
  var pictureSize = this.mozCamera.pictureSize;
  var picked = this.pickThumbnailSize(sizes, pictureSize);
  if (picked) { this.mozCamera.thumbnailSize = picked; }
};

Camera.prototype.setRecorderProfile = function(key) {
  var recorderProfiles = this.mozCamera.capabilities.recorderProfiles;
  this.recorderProfile = recorderProfiles[key];
  this.recorderProfile.key = key;
  debug('video profile set: %s', key);
  return this;
};

Camera.prototype.configureFocus = function(modes) {
  var supports = this.autoFocus = {};
  (modes || []).forEach(function(mode) { supports[mode] = true; });
  debug('focus configured', supports);
};

/**
 * Sets the current flash mode,
 * both on the Camera instance
 * and on the cameraObj hardware.
 *
 * @param {String} key
 */
Camera.prototype.setFlashMode = function(key) {
  this.mozCamera.flashMode = key;
  debug('flash mode set: %s', key);
  return this;
};

/**
 * Releases the camera hardware.
 *
 * @param  {Function} done
 */
Camera.prototype.release = function(done) {
  done = done || function() {};

  if (!this.mozCamera) {
    done();
    return;
  }

  var self = this;
  // The hardware is not available during
  // the release process
  this.cameraReleasePending = true;
  this.mozCamera.release(onSuccess, onError);
  this.mozCamera = null;

  function onSuccess() {
    self.cameraReleasePending = false;
    // If the app is in foreground it reloads the camera
    // This is needed in case the user exits and enters
    // the application quickly. We have to wait until
    // the previous camera has been released to request
    // a new one.
    if(!document.hidden) {
      self.load();
    }
    debug('successfully released');
    done();
  }

  function onError() {
    self.cameraReleasePending = false;
    debug('failed to release hardware');
    done();
  }
};

Camera.prototype.pickThumbnailSize = function(thumbnailSizes, pictureSize) {
  var screenWidth = window.innerWidth * window.devicePixelRatio;
  var screenHeight = window.innerHeight * window.devicePixelRatio;
  var pictureAspectRatio = pictureSize.width / pictureSize.height;
  var currentThumbnailSize;
  var i;

  // Coping the array to not modify the original
  thumbnailSizes = thumbnailSizes.slice(0);
  if (!thumbnailSizes || !pictureSize) {
    return;
  }

  function imageSizeFillsScreen(pixelsWidth, pixelsHeight) {
    return ((pixelsWidth >= screenWidth || // portrait
             pixelsHeight >= screenHeight) &&
            (pixelsWidth >= screenHeight || // landscape
             pixelsHeight >= screenWidth));
  }

  // Removes the sizes with the wrong aspect ratio
  thumbnailSizes = thumbnailSizes.filter(function(thumbnailSize) {
    var thumbnailAspectRatio = thumbnailSize.width / thumbnailSize.height;
    return Math.abs(thumbnailAspectRatio - pictureAspectRatio) < 0.05;
  });

  if (thumbnailSizes.length === 0) {
    console.error('Error while selecting thumbnail size. ' +
      'There are no thumbnail sizes that match the ratio of ' +
      'the selected picture size: ' + JSON.stringify(pictureSize));
    return;
  }

  // Sorting the array from smaller to larger sizes
  thumbnailSizes.sort(function(a, b) {
    return a.width * a.height - b.width * b.height;
  });

  for (i = 0; i < thumbnailSizes.length; ++i) {
    currentThumbnailSize = thumbnailSizes[i];
    if (imageSizeFillsScreen(currentThumbnailSize.width,
                             currentThumbnailSize.height)) {
      return currentThumbnailSize;
    }
  }

  return thumbnailSizes[thumbnailSizes.length - 1];
};

/**
 * Takes a photo, or begins/ends
 * a video capture session.
 *
 * Options:
 *
 *   - `position` {Object} - geolocation to store in EXIF
 *
 * @param  {Object} options
 *  public
 */
Camera.prototype.capture = function(options) {
  switch (this.mode) {
    case 'picture': this.takePicture(options); break;
    case 'video': this.toggleRecording(options); break;
  }
};

Camera.prototype.takePicture = function(options) {
  var rotation = orientation.get();
  var selectedCamera = this.get('selectedCamera');
  var self = this;

  rotation = selectedCamera === 'front' ? -rotation : rotation;
  this.emit('busy');
  this.focus(onFocused);

  function onFocused(err) {
    var position = options && options.position;
    var config = {
      rotation: rotation,
      dateTime: Date.now() / 1000,
      pictureSize: self.pictureSize,
      fileFormat: 'jpeg'
    };

    // If position has been
    // passed in, add it to
    // the config object.
    if (position) {
      config.position = position;
    }

    self.mozCamera.takePicture(config, onSuccess, onError);
  }

  function onError() {
    var title = navigator.mozL10n.get('error-saving-title');
    var text = navigator.mozL10n.get('error-saving-text');
    alert(title + '. ' + text);
    complete();
  }

  function onSuccess(blob) {
    var image = { blob: blob };
    self.resumePreview();
    self.set('focus', 'none');
    self.emit('newimage', image);
    complete();
  }

  function complete() {
    self.emit('ready');
  }
};

/** Focus the camera, callback when done.
 *
 * If the camera don't support focus,
 * callback is called (sync).
 *
 * If the focus fails, the 'focus' state
 * is set, then reset after 1 second.
 *
 * @param  {Function} done
 * @private
 */
Camera.prototype.focus = function(done) {
  if (!this.autoFocus.auto) { return done(); }
  var reset = function() { self.set('focus', 'none'); };
  var self = this;

  this.set('focus', 'focusing');
  this.mozCamera.autoFocus(onFocus);

  function onFocus(success) {
    if (success) {
      self.set('focus', 'focused');
      done();
      return;
    }

    self.set('focus', 'fail');
    setTimeout(reset, 1000);
    done('failed');
  }
};

/**
 * Start/stop recording.
 *
 * @param  {Object} options
 */
Camera.prototype.toggleRecording = function(options) {
  var recording = this.get('recording');
  if (recording) { this.stopRecording(); }
  else { this.startRecording(options); }
};

Camera.prototype.startRecording = function(options) {
  var selectedCamera = this.get('selectedCamera');
  var frontCamera = selectedCamera === 'front';
  var rotation = this.orientation.get();
  var storage = this.video.storage;
  var video = this.video;
  var self = this;

  // Rotation is flipped for front camera
  if (frontCamera) { rotation = -rotation; }

  this.emit('busy');

  // First check if there is enough free space
  this.getFreeVideoStorageSpace(gotStorageSpace);

  function gotStorageSpace(err, freeBytes) {
    if (err) { return self.onRecordingError(); }

    var notEnoughSpace = freeBytes < self.video.minSpace;
    var remaining = freeBytes - self.video.spacePadding;
    var targetFileSize = self.get('maxFileSizeBytes');
    var maxFileSizeBytes = targetFileSize || remaining;

    // Don't continue if there
    // is not enough space
    if (notEnoughSpace) {
      self.onRecordingError('nospace2');
      return;
    }

    // TODO: Callee should
    // pass in orientation
    var config = {
      rotation: rotation,
      maxFileSizeBytes: maxFileSizeBytes
    };

    self.createVideoFilepath(function(filepath) {
      video.filepath = filepath;
      self.mozCamera.startRecording(
        config,
        storage,
        filepath,
        onSuccess,
        self.onRecordingError);
    });
  }

  function onSuccess() {
    self.set('recording', true);
    self.startVideoTimer();
    self.emit('ready');

    // User closed app while
    // recording was trying to start
    //
    // TODO: Not sure this should be here
    if (document.hidden) {
      self.stopRecording();
    }
  }
};

Camera.prototype.stopRecording = function() {
  debug('stop recording');

  var notRecording = !this.get('recording');
  var elapsedTime = Date.now() - this.get('videoStart');
  var storage = this.video.storage;
  var video = this.video;
  var self = this;
  var takenVideo;

  // Ensure we are in the middle of a recording and that the minimum video
  // duration has been exceeded. Video files will not save to the file
  // system unless they are of a certain minimum length (see Bug 899864).
  //
  // TODO: There should be a better way of handling this or a fix for
  // this should be addressed in the Gecko API.
  if (notRecording || elapsedTime < constants.MIN_RECORDING_TIME) {
    return;
  }

  this.stopVideoTimer();
  this.mozCamera.stopRecording();
  this.set('recording', false);
  this.emit('busy');

  // Register a listener for writing
  // completion of current video file
  storage.addEventListener('change', onStorageChange);

  function onStorageChange(e) {
    debug('video file ready', e.path);
    var matchesFile = e.path.indexOf(video.filepath) > -1;

    // Regard the modification as
    // video file writing completion
    // if e.path matches current video
    // filename. Note e.path is absolute path.
    if (e.reason === 'modified' && matchesFile) {
      storage.removeEventListener('change', onStorageChange);
      self.getVideoBlob(gotVideoBlob);
    }
  }

  function gotVideoBlob(blob) {
    takenVideo = {
      blob: blob,
      filepath: video.filepath
    };
    getVideoMetaData(blob, gotVideoMetaData);
  }

  function gotVideoMetaData(error, data) {
    if (error) {
      return self.onRecordingError();
    }
    takenVideo.poster = data.poster;
    takenVideo.width = data.width;
    takenVideo.height = data.height;
    takenVideo.rotation = data.rotation;
    self.emit('newvideo', takenVideo);
    self.emit('ready');
  }

};

// TODO: This is UI stuff, so
// shouldn't be handled in this file.
Camera.prototype.onRecordingError = function(id) {
  id = id && id !== 'FAILURE' ? id : 'error-recording';
  var title = navigator.mozL10n.get(id + '-title');
  var text = navigator.mozL10n.get(id + '-text');
  alert(title + '. ' + text);
  this.emit('ready');
};

/**
 * Emit useful event hook.
 *
 * @private
 */
Camera.prototype.onShutter = function() {
  this.emit('shutter');
};

/**
 * The preview state change events come
 * from the camera hardware. If 'stopped'
 * or 'paused' the camera must not be used.
 *
 * @param  {String} state
 * @private
 */
Camera.prototype.onPreviewStateChange = function(state) {
  debug('preview state change: %s', state);
  var busy = state === 'stopped' || state === 'paused';
  if (busy) { this.emit('busy'); }
  else { this.emit('ready'); }
};

/**
 * Emit useful event hook.
 *
 * @param  {String} msg
 * @private
 */
Camera.prototype.onRecorderStateChange = function(msg) {
  if (msg === 'FileSizeLimitReached') {
    this.emit('filesizelimitreached');
  }
};

/**
 * Get the number of remaining
 * bytes in video storage.
 *
 * @param  {Function} done
 * @async
 * @private
 */
Camera.prototype.getFreeVideoStorageSpace = function(done) {
  debug('get free storage space');

  var storage = this.video.storage;
  var req = storage.freeSpace();
  req.onerror = onError;
  req.onsuccess = onSuccess;

  function onSuccess() {
    var freeBytes = req.result;
    debug('%d free space found', freeBytes);
    done(null, freeBytes);
  }

  function onError() {
    done('error');
  }
};

/**
 * Get the recorded video out of storage.
 *
 * @param  {Function} done
 * @private
 * @async
 */
Camera.prototype.getVideoBlob = function(done) {
  debug('get video blob');
  var video = this.video;
  var req = video.storage.get(video.filepath);
  req.onsuccess = onSuccess;
  req.onerror = onError;

  function onSuccess() {
    debug('got video blob');
    done(req.result);
  }

  function onError() {
    console.error('failed to get \'%s\' from storage', video.filepath);
  }
};

/**
 * Get a unique video filepath
 * to record a new video to.
 *
 * Your application can overwrite
 * this method with something
 * so that you can record directly
 * to final location. We do this
 * in CameraController.
 *
 * Callback function signature used
 * so that an async override can
 * be used if you wish.
 *
 * @param  {Function} done
 */
Camera.prototype.createVideoFilepath = function(done) {
  done(Date.now() + '_tmp.3gp');
};

Camera.prototype.resumePreview = function() {
  this.mozCamera.resumePreview();
  this.emit('previewresumed');
};

/**
 * Toggles between 'picture'
 * and 'video' capture modes.
 *
 * @return {String}
 */
Camera.prototype.setMode = function(mode) {
  var recording = this.get('recording');
  if (recording) { this.stopRecording(); }
  this.mode = mode;
  return this;
};

/**
 * Sets a start time and begins
 * updating the elapsed time
 * every second.
 *
 */
Camera.prototype.startVideoTimer = function() {
  this.set('videoStart', new Date().getTime());
  this.videoTimer = setInterval(this.updateVideoElapsed, 1000);
  this.updateVideoElapsed();
};

Camera.prototype.stopVideoTimer = function() {
  clearInterval(this.videoTimer);
  this.videoTimer = null;
};

/**
 * Calculates the elapse time
 * and updateds the 'videoElapsed'
 * value.
 *
 * We listen for the 'change:'
 * event emitted elsewhere to
 * update the UI accordingly.
 *
 */
Camera.prototype.updateVideoElapsed = function() {
  var now = new Date().getTime();
  var start = this.get('videoStart');
  this.set('videoElapsed', (now - start));
};

/**
 * Set ISO value for
 * better picture
 */
Camera.prototype.setISOMode = function(value) {
  var isoModes = this.mozCamera.capabilities.isoModes;
  if (isoModes && isoModes.indexOf(value) > -1) {
    this.mozCamera.isoMode = value;
  }
};

/**
 * Set the mozCamera white-balance value.
 *
 * @param {String} value
 */
Camera.prototype.setWhiteBalance = function(value){
  var capabilities = this.mozCamera.capabilities;
  var modes = capabilities.whiteBalanceModes;
  if (modes && modes.indexOf(value) > -1) {
    this.mozCamera.whiteBalanceMode = value;
  }
};

/**
 * Set HDR mode.
 *
 * HDR is a scene mode, so we
 * transform the hdr value to
 * the appropriate scene value.
 *
 * @param {String} value
 */
Camera.prototype.setHDR = function(value){
  if (!value) { return; }
  var scene = value === 'on' ? 'hdr' : 'auto';
  this.setSceneMode(scene);
};

/**
 * Set scene mode.
 *
 * @param {String} value
 */
Camera.prototype.setSceneMode = function(value){
  var modes =  this.get('capabilities').sceneModes;
  if (modes.indexOf(value) > -1) {
    this.mozCamera.sceneMode = value;
  }
};

Camera.prototype.isZoomSupported = function() {
  return this.mozCamera.capabilities.zoomRatios.length > 1;
};

Camera.prototype.configureZoom = function(previewSize) {
  var maxPreviewSize =
    CameraUtils.getMaximumPreviewSize(this.previewSizes());

  // Calculate the maximum amount of zoom that the hardware will
  // perform. This calculation is determined by taking the maximum
  // supported preview size *width* and dividing by the current preview
  // size *width*.
  var maxHardwareZoom = maxPreviewSize.width / previewSize.width;
  this.set('maxHardwareZoom', maxHardwareZoom);

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
      if (self.get('selectedCamera') === 'front') {
        self.set('maxHardwareZoom', 1);
      } else {
        self.set('maxHardwareZoom', 1.25);
      }
    }
  };
};

Camera.prototype.getMinimumZoom = function() {
  var zoomRatios = this.mozCamera.capabilities.zoomRatios;
  if (zoomRatios.length === 0) {
    return 1.0;
  }

  return zoomRatios[0];
};

Camera.prototype.getMaximumZoom = function() {
  var zoomRatios = this.mozCamera.capabilities.zoomRatios;
  if (zoomRatios.length === 0) {
    return 1.0;
  }

  return zoomRatios[zoomRatios.length - 1];
};

Camera.prototype.getZoom = function() {
  return this.mozCamera.zoom;
};

Camera.prototype.setZoom = function(zoom) {
  this.mozCamera.zoom = zoom;
  this.emit('zoomChange', zoom);
};

Camera.prototype.getZoomPreviewAdjustment = function() {
  var zoom = this.mozCamera.zoom;
  var maxHardwareZoom = this.get('maxHardwareZoom');
  if (zoom <= maxHardwareZoom) {
    return 1.0;
  }

  return zoom / maxHardwareZoom;
};

/**
 * Retrieves the angle of orientation of the camera hardware's
 * image sensor. This value is calculated as the angle that the
 * camera image needs to be rotated (clockwise) so that it appears
 * correctly on the display in the device's natural (portrait)
 * orientation
 *
 * Reference:
 * http://developer.android.com/reference/android/hardware/Camera.CameraInfo.html#orientation
 *
 * @return {Number}
 */
Camera.prototype.getSensorAngle = function() {
  return this.mozCamera.sensorAngle;
};

});
