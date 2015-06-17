define(function(require, exports, module) {
'use strict';

/**
 * Module Dependencies
 */

var CameraUtils = require('lib/camera-utils');
var orientation = require('lib/orientation');
var Focus = require('lib/camera/focus');
var debug = require('debug')('camera');
var debounce = require('lib/debounce');
var bindAll = require('lib/bind-all');
var mix = require('lib/mixin');
var model = require('model');

/**
 * Mixin `Model` API (inc. events)
 */

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
 *   - {object} `focus`
 *
 * @param {Object} options
 */
function Camera(options) {
  debug('initializing');
  bindAll(this);

  // Options
  options = options || {};

  // mozCamera config is cached by default
  this.cacheConfig = options.cacheConfig !== false;

  // Minimum video duration length for creating a
  // video that contains at least few samples, see bug 899864.
  // Empirical testing has shown that it is common to get corrupted
  // files under 1400ms (e.g. on the nexus 5).
  this.minRecordingTime = options.minRecordingTime || 1500;

  // Number of bytes left on disk to let us stop recording.
  this.recordSpacePadding = options.recordSpacePadding || 1024 * 1024 * 1;

  // The minimum available disk space to start recording a video.
  this.recordSpaceMin = options.recordSpaceMin || 1024 * 1024 * 2;

  // The number of times to attempt
  // hardware request before giving up
  this.requestAttempts = options.requestAttempts || 3;

  // Test hooks
  this.orientation = options.orientation || orientation;
  this.configStorage = options.configStorage || localStorage;

  this.cameraList = navigator.mozCameras.getListOfCameras();
  this.mozCamera = null;

  this.storage = options.storage || {};

  // Video config
  this.video = {
    filepath: null,
    minSpace: this.recordSpaceMin,
    spacePadding : this.recordSpacePadding,
    poster: {
      filepath: null,
    }
  };

  this.focus = new Focus(options.focus);
  this.suspendedFlashCount = 0;

  // Always boot in 'picture' mode
  // with 'back' camera. This may need
  // to be configurable at some point.
  this.mode = 'picture';
  this.selectedCamera = 'back';

  // Allow `configure` to be called multiple
  // times in the same frame, but only ever run once.
  this.configure = debounce(this.configure);

  debug('initialized');
}

/**
 * Loads the currently selected camera.
 *
 * There are cases whereby the camera
 * may still be 'releasing' its hardware.
 * If this is the case we wait for the
 * release process to finish, then attempt
 * to load again.
 *
 * @public
 */
Camera.prototype.load = function() {
  debug('load camera');

  var loadingNewCamera = this.selectedCamera !== this.lastLoadedCamera;
  var self = this;

  // If hardware is still being released
  // we're not allowed to request the camera.
  if (this.releasing) {
    debug('wait for camera release');
    this.once('released', function() { self.load(); });
    return;
  }

  // Don't re-load hardware if selected camera is the same.
  if (this.mozCamera && !loadingNewCamera) {
    debug('camera not changed');
    this.ready();
    return;
  }

  // If a camera is already loaded,
  // it must be 'released' first.
  // We also discard the `mozCameraConfig`
  // as the previous camera config
  // won't apply to the new camera.
  if (this.mozCamera) {
    this.release(ready);
  } else {
    ready();
  }

  // Once ready we request the camera
  // with the currently `selectedCamera`
  // and any `mozCameraConfig` that may
  // be in memory.
  //
  // The only time there should be a
  // valid `mozCameraConfig` in memory
  // is when the app becomes visible again
  // after being hidden. and we wish to
  // request the camera again in exactly
  // the same state it was previously in.
  function ready() {
    self.requestCamera(self.selectedCamera);
    self.lastLoadedCamera = self.selectedCamera;
  }
};

/**
 * Requests the mozCamera object,
 * then configures it.
 *
 * @private
 */
Camera.prototype.requestCamera = function(camera, config) {
  if (!config) {
    config = {
      mode: this.mode
    };
  }

  debug('request camera', camera, config);
  if (this.isBusy) { return; }

  var attempts = this.requestAttempts;
  var self = this;

  // Indicate 'busy'
  this.configured = false;
  this.busy('requestingCamera');

  // Make initial request
  request();

  /**
   * Requests the camera hardware.
   *
   * @private
   */
  function request() {
    navigator.mozCameras.getCamera(camera, config)
      .then(onSuccess, onError);

    self.emit('requesting');
    debug('camera requested', camera, config);
    attempts--;
  }

  function onSuccess(params) {
    debug('successfully got mozCamera');

    // release camera when press power key
    // as soon as you open a camera app
    if (document.hidden) {
      self.mozCamera = params.camera;
      self.release();
      return;
    }

    self.updateConfig(params.configuration);
    self.setupNewCamera(params.camera);
    self.configureFocus();
    self.emit('focusconfigured', {
      mode: self.mozCamera.focusMode,
      touchFocus: self.focus.touchFocus,
      faceDetection: self.focus.faceDetection,
      maxDetectedFaces: self.focus.maxDetectedFaces
    });

    // If the camera was configured in the
    // `mozCamera.getCamera()` call, we can
    // fire the 'configured' event now.
    if (self.configured) { self.emit('configured'); }

    self.ready();
  }

  /**
   * Called when the request for camera
   * hardware fails.
   *
   * If the hardware is 'closed' we attempt
   * to re-request it one second later, until
   * all our attempts have run out.
   *
   * @param  {String} err
   */
  function onError(err) {
    debug('error requesting camera', err);

    if (err === 'HardwareClosed' && attempts) {
      self.cameraRequestTimeout = setTimeout(request, 1000);
      return;
    }

    self.emit('error', 'request-fail');
    self.ready();
  }
};

Camera.prototype.updateConfig = function(config) {
  this.givenPreviewSize = config.previewSize;
  this.pictureSize = config.pictureSize;
  this.recorderProfile = config.recorderProfile;
  this.configured = true;
};

/**
 * Configures the newly recieved
 * mozCamera object.
 *
 * Setting the 'cababilities' key
 * triggers 'change' callback inside
 * the CameraController that sets the
 * app up for the new camera.
 *
 * @param  {MozCamera} mozCamera
 * @private
 */
Camera.prototype.setupNewCamera = function(mozCamera) {
  debug('configuring camera');
  var capabilities = mozCamera.capabilities;
  this.mozCamera = mozCamera;

  // Bind to some events
  this.mozCamera.addEventListener('shutter', this.onShutter);
  this.mozCamera.addEventListener('close', this.onClosed);
  this.mozCamera.addEventListener('previewstatechange',
                                  this.onPreviewStateChange);
  this.mozCamera.addEventListener('recorderstatechange',
                                  this.onRecorderStateChange);

  this.capabilities = this.formatCapabilities(capabilities);

  this.emit('newcamera', this.capabilities);
  debug('configured new camera');
};

/**
 * Camera capablities need to be in
 * a consistent format.
 *
 * We shallow clone to make sure the
 * app doesnt' make changes to the
 * original `capabilities` object.
 *
 * @param  {Object} capabilities
 * @return {Object}
 */
Camera.prototype.formatCapabilities = function(capabilities) {
  var hasHDR = capabilities.sceneModes.indexOf('hdr') > -1;
  var hdr = hasHDR ? ['on', 'off'] : undefined;
  return mix({ hdr: hdr }, capabilities);
};

/**
 * Configure the camera hardware
 * with the current `mode`, `previewSize`
 * and `recorderProfile`.
 *
 * @private
 */
Camera.prototype.configure = function() {
  debug('configuring hardware...');
  var self = this;

  // As soon as a request to configure
  // comes in, the confuguration is now
  // dirty (out-of-date), and the hardware
  // must be reconfigured at some point.
  this.configured = false;

  // Ensure that any requests that
  // come in whilst busy get run once
  // camera is ready again.
  if (this.isBusy) {
    debug('defering configuration');
    this.once('ready', this.configure);
    return;
  }

  // Exit here if there is no camera
  if (!this.mozCamera) {
    debug('no mozCamera');
    return;
  }

  // In some extreme cases the mode can
  // get changed and configured whilst
  // video recording is in progress.
  this.stopRecording();

  // Indicate 'busy'
  this.busy();

  // Create a new `mozCameraConfig`
  var mozCameraConfig = {
    mode: this.mode,
    pictureSize: this.pictureSize,
    recorderProfile: this.recorderProfile
  };

  // Configure the camera hardware
  this.mozCamera.setConfiguration(mozCameraConfig)
    .then(onSuccess, onError);
  debug('mozCamera configuring', mozCameraConfig);

  function onSuccess(config) {
    debug('configuration success');
    if (!self.mozCamera) { return; }
    self.updateConfig(config);
    self.configureFocus();
    self.emit('configured');
    self.ready();
  }

  function onError(err) {
    debug('Error configuring camera');
    self.configured = true;
    self.ready();
  }
};

Camera.prototype.configureFocus = function() {
  this.focus.configure(this.mozCamera, this.mode);
  this.focus.onFacesDetected = this.onFacesDetected;
  this.focus.onAutoFocusChanged = this.onAutoFocusChanged;
};

Camera.prototype.shutdown = function() {
  this.stopRecording();
  this.set('previewActive', false);
  this.set('focus', 'none');
  this.release();
};

Camera.prototype.onAutoFocusChanged = function(state) {
  this.set('focus', state);
};

Camera.prototype.onFacesDetected = function(faces) {
  this.emit('facesdetected', faces);
};

/**
 * Plugs Video Stream into Video Element.
 *
 * @param  {Elmement} videoElement
 * @public
 */
Camera.prototype.loadStreamInto = function(videoElement) {
  debug('loading stream into element');
  if (!this.mozCamera) {
    debug('error - `mozCamera` is undefined or null');
    return;
  }

  // REVIEW: Something is wrong if we are
  // calling this without a video element.
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

/**
 * Return available preview sizes.
 *
 * @return {Array}
 * @private
 */
Camera.prototype.previewSizes = function() {
  if (!this.mozCamera) { return; }
  return this.mozCamera.capabilities.previewSizes;
};

/**
 * Return the current optimal preview size.
 *
 * @return {Object}
 * @private
 */
Camera.prototype.previewSize = function() {
  return this.givenPreviewSize;
};

/**
 * Get the current recording resolution.
 *
 * @return {Object}
 */
Camera.prototype.resolution = function() {
  switch (this.mode) {
    case 'picture': return this.pictureSize;
    case 'video': return this.getRecorderProfile().video;
  }
};

/**
 * Set the picture size.
 *
 * If the given size is the same as the
 * currently set pictureSize then no
 * action is taken.
 *
 * The camera is 'configured' a soon as the
 * pictureSize is changed. `.configure` is
 * debounced so it will only ever run once
 * per turn.
 *
 * Options:
 *
 *   - {Boolean} `configure`
 *
 * @param {Object} size
 */
Camera.prototype.setPictureSize = function(size, options) {
  debug('set picture size', size);
  if (!size) { return; }

  // Configure unless `false`
  var configure = !(options && options.configure === false);

  // Don't do waste time re-configuring the
  // hardware if the pictureSize hasn't changed.
  if (this.isPictureSize(size)) {
    debug('pictureSize didn\'t change');
    return;
  }

  this.pictureSize = size;

  // Configure the hardware only when required
  if (configure) {
    this.configure();
  } else {
    this.mozCamera.setPictureSize(size);
  }
  this.setThumbnailSize();

  debug('pictureSize changed');
  return this;
};

Camera.prototype.isPictureSize = function(size) {
  if (!this.pictureSize) { return false; }
  var sameWidth = size.width === this.pictureSize.width;
  var sameHeight = size.height === this.pictureSize.height;
  return sameWidth && sameHeight;
};

/**
 * Set the recorder profile.
 *
 * If the given profile is the same as
 * the current profile, no action is
 * taken.
 *
 * The camera is 'configured' a soon as the
 * recorderProfile is changed (`.configure()` is
 * debounced so it will only ever run once
 * per turn).
 *
 * Options:
 *
 *   - {Boolean} `configure`
 *
 * @param {String} key
 */
Camera.prototype.setRecorderProfile = function(key, options) {
  debug('set recorderProfile: %s', key);
  if (!key) { return; }

  // Configure unless `false`
  var configure = !(options && options.configure === false);

  // Exit if not changed
  if (this.isRecorderProfile(key)) {
    debug('recorderProfile didn\'t change');
    return;
  }

  this.recorderProfile = key;
  if (configure) { this.configure(); }

  debug('recorderProfile changed: %s', key);
  return this;
};

Camera.prototype.isRecorderProfile = function(key) {
  return key === this.recorderProfile;
};

/**
 * Returns the full profile of the
 * currently set recordrProfile.
 *
 * @return {Object}
 */
Camera.prototype.getRecorderProfile = function() {
  var key = this.recorderProfile;
  return this.mozCamera.capabilities.recorderProfiles[key];
};

Camera.prototype.setThumbnailSize = function() {
  var sizes = this.mozCamera.capabilities.thumbnailSizes;
  var pictureSize = this.mozCamera.getPictureSize();
  var picked = this.pickThumbnailSize(sizes, pictureSize);
  if (picked) { this.mozCamera.setThumbnailSize(picked); }
};

/**
 * Sets the current flash mode,
 * both on the Camera instance
 * and on the cameraObj hardware.
 * If flash is suspended, it
 * updates the cached state that
 * will be restored.
 *
 * @param {String} key
 */
Camera.prototype.setFlashMode = function(key) {
  if (this.mozCamera) {
    // If no key was provided, set it to 'off' which is
    // a valid flash mode.
    key = key || 'off';

    if (this.suspendedFlashCount > 0) {
      this.suspendedFlashMode = key;
      debug('flash mode set while suspended: %s', key);
    } else {
      this.mozCamera.flashMode = key;
      debug('flash mode set: %s', key);
    }
  }

  return this;
};

/**
 * Releases the camera hardware.
 *
 * @param  {Function} done
 */
Camera.prototype.release = function(done) {
  debug('release');
  done = done || function() {};
  var self = this;

  // Clear any pending hardware requests
  clearTimeout(this.cameraRequestTimeout);

  // Ignore if there is no loaded camera
  if (!this.mozCamera) {
    done();
    return;
  }

  this.busy();
  this.stopRecording();
  this.set('focus', 'none');
  this.mozCamera.release().then(onSuccess, onError);
  this.releasing = true;
  this.mozCamera = null;

  // Reset cached parameters
  delete this.pictureSize;
  delete this.recorderProfile;
  delete this.givenPreviewSize;

  function onSuccess() {
    debug('successfully released');
    self.ready();
    self.releasing = false;
    self.emit('released');
    done();
  }

  function onError(err) {
    debug('failed to release hardware');
    self.ready();
    self.releasing = false;
    done(err);
  }
};

// TODO: Perhaps this function should be moved into a separate lib
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
 * @public
 */
Camera.prototype.capture = function(options) {
  if (!this.mozCamera) { return false; }
  switch (this.mode) {
    case 'picture': this.takePicture(options); break;
    case 'video': this.toggleRecording(options); break;
  }
};

/**
 * Take a picture.
 *
 * Options:
 *
 *   - {Number} `position` - geolocation to store in EXIF
 *
 * @param  {Object} options
 */
Camera.prototype.takePicture = function(options) {
  debug('take picture', options);
  this.busy();

  var rotation = this.orientation.get();
  var selectedCamera = this.selectedCamera;
  var self = this;
  var position = options && options.position;
  var config = {
    dateTime: Date.now() / 1000,
    pictureSize: self.pictureSize,
    fileFormat: 'jpeg'
  };

  // If position has been passed in,
  // add it to the config object.
  if (position) {
    config.position = position;
  }

  // Front camera is inverted, so flip rotation
  config.rotation = selectedCamera === 'front' ? -rotation : rotation;

  // If the camera focus is 'continuous' or 'infinity'
  // we can take the picture straight away.
  if (this.focus.getMode() === 'auto') {
    this.focus.focus(onFocused);
  } else {
    takePicture();
  }

  function onFocused(state) {
    takePicture();
  }

  function takePicture() {
    self.busy('takingPicture');
    self.mozCamera.takePicture(config).then(onSuccess, onError);
  }

  function onError(error) {
    var title = navigator.mozL10n.get('error-saving-title');
    var text = navigator.mozL10n.get('error-saving-text');

    // if taking a picture fails because there's
    // already a picture being taken we ignore it.
    if (error === 'TakePictureAlreadyInProgress') {
      complete();
    } else {
      alert(title + '. ' + text);
      debug('error taking picture');
      complete();
    }
  }

  function onSuccess(blob) {
    var image = { blob: blob };
    self.resumePreview();
    self.set('focus', 'none');
    self.emit('newimage', image);
    debug('success taking picture');
    complete();
  }

  function complete() {
    self.set('focus', 'none');
    self.ready();
  }
};

Camera.prototype.updateFocusArea = function(rect, done) {
  this.focus.updateFocusArea(rect, focusDone);
  function focusDone(state) {
    if (done) {
      done(state);
    }
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

/**
 * Seet the storage for video.
 *
 * @public
 */
Camera.prototype.setStorage = function(storage) {
  this.storage.video = storage.video;
  this.storage.picture = storage.picture;
};

/**
 * Start recording a video.
 *
 * @public
 */
Camera.prototype.startRecording = function(options) {
  debug('start recording');
  var frontCamera = this.selectedCamera === 'front';
  var rotation = this.orientation.get();
  var storage = this.storage.video;
  var video = this.video;
  var self = this;

  // Rotation is flipped for front camera
  if (frontCamera) { rotation = -rotation; }

  this.set('recording', true);
  this.busy();

  // Lock orientation during video recording
  //
  // REVIEW: This should *not* be here. This
  // is an App concern and should live in
  // the `CameraController`.
  this.orientation.stop();

  var profile = this.resolution();
  video.width = profile.width;
  video.height = profile.height;

  // Calculate what the configured rotation of the video will be
  // so that we don't have to load the metadata to find this out
  video.rotation = this.orientation.rationalize(this.getSensorAngle(),
                                                rotation);

  var previewSize = this.previewSize();
  video.poster.width = previewSize.width;
  video.poster.height = previewSize.height;
  video.poster.rotation = video.rotation;

  // First check if there is enough free space
  this.getFreeVideoStorageSpace(gotStorageSpace);

  function gotStorageSpace(err, freeBytes) {
    if (self.stopRecordPending) {
      debug('start recording interrupted (getFreeVideoStorageSpace)');
      return self.stoppedRecording();
    }

    if (err) { return self.onStartRecordingError(); }

    var notEnoughSpace = freeBytes < self.video.minSpace;
    var remaining = freeBytes - self.video.spacePadding;
    var targetFileSize = self.get('maxFileSizeBytes');
    var maxFileSizeBytes = targetFileSize || remaining;

    // Don't continue if there
    // is not enough space
    if (notEnoughSpace) {
      self.onStartRecordingError('nospace2');
      return;
    }

    // TODO: Callee should
    // pass in orientation
    var config = {
      rotation: rotation,
      maxFileSizeBytes: maxFileSizeBytes
    };

    self.createVideoFilepath(createVideoFilepathDone);

    function createVideoFilepathDone(errorMsg, filepath) {
      if (self.stopRecordPending) {
        debug('start recording interrupted (createVideoFilepath)');
        return self.stoppedRecording();
      }

      if (typeof filepath === 'undefined') {
        debug(errorMsg);
        return self.onStartRecordingError('error-video-file-path');
      }

      video.filepath = filepath;
      video.poster.filepath = filepath.replace('.3gp', '.jpg');
      config.posterFilepath = video.poster.filepath;
      config.posterStorageArea = self.storage.picture;
      self.emit('willrecord');
      self.mozCamera.startRecording(config, storage, filepath)
        .then(onSuccess, onError);
    }
  }

  function onError(err) {
    // Regardless of error, if we called out to mozCamera, it may have
    // created an empty file and we need to clean that up.
    storage.delete(video.filepath);
    // IN_PROGRESS means there is already a startRecording call in
    // progress; we can ignore it because it will have its own duplicated
    // success/error path.
    if (err.name === 'NS_ERROR_IN_PROGRESS') {
      debug('start recording error (in progress)');
      return;
    }
    // ABORT means a stopRecording call interrupted us. Since it never
    // transitioned to the Started recording state, we need to stop
    // explicitly here.
    if (err.name === 'NS_ERROR_ABORT') {
      debug('start recording error (abort)');
      return self.stoppedRecording();
    }
    // Ignore err as we use our own set of error
    // codes; instead trigger using the default
    self.onStartRecordingError();
  }

  function onSuccess() {
    self.ready();

    // User closed app while
    // recording was trying to start
    //
    // TODO: Not sure this should be here
    if (document.hidden) {
      self.stopRecording();
    }
  }
};

Camera.prototype.startedRecording = function() {
  debug('started recording');
  this.startVideoTimer();
};

/**
 * Stop recording the video.
 *
 * Once we have told the camera to stop recording
 * the video we attach a 'change' listener to the
 * video storage and wait. Once the listener fires
 * we know that the video file has been saved.
 *
 * At this point we fetch the file Blob from
 * storage and then call the `.onNewVideo()`
 * method to handle the final stages.
 *
 * @public
 */
Camera.prototype.stopRecording = function() {
  debug('stop recording');

  var notRecording = !this.get('recording');

  // Even if we have requested a recording to stop, that doesn't
  // mean it has finished yet, as we need to wait for the recorder
  // state change event.
  if (notRecording || this.stopRecordPending) {
    debug('not recording or stop pending');
    return;
  }

  this.stopRecordPending = true;
  this.busy();
  this.mozCamera.stopRecording();
};

Camera.prototype.stoppedRecording = function(recorded) {
  debug('stopped recording');
  this.stopVideoTimer();
  this.stopRecordPending = false;
  this.set('recording', false);

  // Unlock orientation when stopping video recording.
  // REVIEW:WP This logic is out of scope of the
  // Camera hardware. Only the App should be
  // making such high level decicions.
  this.orientation.start();

  var self = this;
  var videoReq;
  var posterReq;
  var video;

  if (recorded) {
    video = mix({}, this.video);

    // Re-fetch the blobs from storage
    videoReq = this.storage.video.get(video.filepath);
    posterReq = this.storage.picture.get(video.poster.filepath);

    Promise.all([videoReq.then(), posterReq.then()]).then(function() {
      video.blob = videoReq.result;
      video.poster.blob = posterReq.result;
      // Tell the app the new video is ready
      self.emit('newvideo', video);
      self.ready();
    }, function() {
      if (self) {
        self.onStopRecordingError(video);
        self = null;
      }
    });
  }
};

// TODO: This is UI stuff, so
// shouldn't be handled in this file.
Camera.prototype.onRecordingError = function(id) {
  id = id && id !== 'FAILURE' ? id : 'error-recording';
  var title = navigator.mozL10n.get(id + '-title');
  var text = navigator.mozL10n.get(id + '-text');
  alert(title + '. ' + text);
  this.ready();
};

Camera.prototype.onStartRecordingError = function(id) {
  debug('start record error');
  this.stoppedRecording();
  this.onRecordingError(id);
};

Camera.prototype.onStopRecordingError = function(video) {
  debug('stop record error');

  // These files may or may not exist, delete them just in case
  this.storage.video.delete(video.filepath);
  this.storage.picture.delete(video.poster.filepath);

  // If the time between start/stop was really short, suppress the
  // error dialog to the user -- they wouldn't have expected to
  // get a recording anyways
  var elapsedTime = this.get('videoElapsed');
  if (elapsedTime < this.minRecordingTime) {
    this.ready();
  } else {
    this.onRecordingError();
  }
};

/**
 * Emit a 'shutter' event so that
 * app UI can respond with shutter
 * animations and sounds effects.
 *
 * @private
 */
Camera.prototype.onShutter = function() {
  this.emit('shutter');
};

/**
 * Emit a 'closed' event when camera controller
 * closes
 *
 * @private
 */
Camera.prototype.onClosed = function(e) {
  this.shutdown();
  this.emit('closed', e.reason);
};

/**
 * The preview state change events come
 * from the camera hardware. If 'stopped'
 * or 'paused' the camera must not be used.
 *
 * @param  event with {String} newState ['started', 'stopped', 'paused']
 * @private
 */
Camera.prototype.onPreviewStateChange = function(e) {
  var state = e.newState;
  debug('preview state change: %s', state);
  this.previewState = state;
  this.emit('preview:' + state);
};

/**
 * Emit useful event hook.
 *
 * @param  {String} msg
 * @private
 */
Camera.prototype.onRecorderStateChange = function(e) {
  var msg = e.newState;
  debug('recorder state change: %s', msg);
  if (msg === 'FileSizeLimitReached') {
    this.emit('filesizelimitreached');
  } else if(msg === 'Started') {
    this.startedRecording();
  } else if(msg === 'Stopped') {
    // The last event to come in is always Stopped; if an asynchronous
    // error happened (i.e. couldn't create the poster), we need to
    // report the error to the user.
    if (this.stopRecordError) {
      this.onStopRecordingError(this.video);
    }
    this.stoppedRecording(!this.stopRecordError);
    this.stopRecordError = false;
  } else if(msg === 'PosterFailed' || msg === 'TrackFailed' ||
            msg === 'MediaRecorderFailed' || msg === 'MediaServerFailed')
  {
    // TrackFailed is triggered when the video has no samples (i.e.
    // is too short) and would fail to be loaded by the application
    this.stopRecordError = true;
    this.stopRecording();
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

  var storage = this.storage.video;
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
  done(null, Date.now() + '_tmp.3gp');
};

/**
 * Resume the preview stream.
 *
 * After a photo has been taken the
 * preview stream freezes on the
 * taken frame. We call this function
 * to start the stream flowing again.
 *
 * @private
 */
Camera.prototype.resumePreview = function() {
  this.mozCamera.resumePreview();
  // After calling takePicture(Camera.ShutterCallback, Camera.PictureCallback,
  // Camera.PictureCallback) or stopPreview(), and then resuming preview with
  // startPreview(), the apps should call this method again to resume face
  // detection. See Bug 1070791.
  this.focus.startFaceDetection();
  this.emit('previewresumed');
};

/**
 * Sets the selected camera to the
 * given string and then reloads
 * the camera.
 *
 * If the given camera is already
 * selected, no action is taken.
 *
 * @param {String} camera 'front'|'back'
 * @public
 */
Camera.prototype.setCamera = function(camera) {
  debug('set camera: %s', camera);
  if (this.selectedCamera === camera) { return; }
  this.selectedCamera = camera;
  this.load();
};

/**
 * Toggles between 'picture'
 * and 'video' capture modes.
 *
 * @return {String}
 * @public
 */
Camera.prototype.setMode = function(mode) {
  debug('setting mode to: %s', mode);
  if (this.isMode(mode)) { return; }
  this.mode = mode;
  this.configure();
  return this;
};

/**
 * States if the camera is currently
 * set to the passed mode.
 *
 * @param  {String}  mode  ['picture'|'video']
 * @return {Boolean}
 * @public
 */
Camera.prototype.isMode = function(mode) {
  return this.mode === mode;
};

/**
 * Sets a start time and begins
 * updating the elapsed time
 * every second.
 *
 * @private
 */
Camera.prototype.startVideoTimer = function() {
  this.set('videoStart', new Date().getTime());
  this.videoTimer = setInterval(this.updateVideoElapsed, 1000);
  this.updateVideoElapsed();
};

/**
 * Clear the video timer interval.
 *
 * @private
 */
Camera.prototype.stopVideoTimer = function() {
  clearInterval(this.videoTimer);
  this.videoTimer = null;
  this.updateVideoElapsed();
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
 * Set ISO value.
 *
 * @param {String} value
 * @public
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
 * @public
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
 * @public
 */
Camera.prototype.setHDR = function(value){
  debug('set hdr: %s', value);
  if (!value) { return; }
  var scene = value === 'on' ? 'hdr' : 'auto';
  this.setSceneMode(scene);
};

/**
 * Set scene mode.
 *
 * @param {String} value
 * @public
 */
Camera.prototype.setSceneMode = function(value){
  var modes = this.mozCamera.capabilities.sceneModes;
  if (modes.indexOf(value) > -1) {
    this.mozCamera.sceneMode = value;
  }
};

/**
 * Check if the hardware supports zoom.
 *
 * @return {Boolean}
 */
Camera.prototype.isZoomSupported = function() {
  return this.mozCamera.capabilities.zoomRatios.length > 1;
};

Camera.prototype.configureZoom = function() {
  var previewSize = this.previewSize();
  var maxPreviewSize =
    CameraUtils.getMaximumPreviewSize(this.previewSizes());

  // Calculate the maximum amount of zoom that the hardware will
  // perform. This calculation is determined by taking the maximum
  // supported preview size *width* and dividing by the current preview
  // size *width*.
  var maxHardwareZoom = maxPreviewSize.width / previewSize.width;
  this.set('maxHardwareZoom', maxHardwareZoom);

  this.setZoom(this.getMinimumZoom());
  this.emit('zoomconfigured', this.getZoom());
  return this;
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
  this.zoom = zoom;
  this.emit('zoomchanged', this.zoom);

  // Stop here if we're already waiting for
  // `mozCamera.zoom` to be updated.
  if (this.zoomChangeTimeout) {
    return;
  }

  var self = this;

  // Throttle to prevent hammering the Camera API.
  this.zoomChangeTimeout = window.setTimeout(function() {
    self.zoomChangeTimeout = null;

    self.mozCamera.zoom = self.zoom;
  }, 150);
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
 * @public
 */
Camera.prototype.getSensorAngle = function() {
  return this.mozCamera && this.mozCamera.sensorAngle;
};

/**
 * A central place to indicate
 * the camera is 'busy'.
 *
 * @private
 */
Camera.prototype.busy = function(type) {
  debug('busy %s', type || '');
  this.isBusy = true;
  this.emit('busy', type);
  clearTimeout(this.readyTimeout);
};

/**
 * A central place to indicate
 * the camera is 'ready'.
 *
 * @private
 */
Camera.prototype.ready = function() {
  var self = this;
  this.isBusy = false;
  clearTimeout(this.readyTimeout);
  this.readyTimeout = setTimeout(function() {
    debug('ready');
    self.emit('ready');
  }, 150);
};

});
