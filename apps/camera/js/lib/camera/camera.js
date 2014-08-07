define(function(require, exports, module) {
'use strict';

/**
 * Module Dependencies
 */

var CameraUtils = require('lib/camera-utils');
var getVideoMetaData = require('lib/get-video-meta-data');
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
  this.minRecordingTime = options.minRecordingTime  || 1000;

  // Number of bytes left on disk to let us stop recording.
  this.recordSpacePadding = options.recordSpacePadding || 1024 * 1024 * 1;

  // The minimum available disk space to start recording a video.
  this.recordSpaceMin = options.recordSpaceMin || 1024 * 1024 * 2;

  // Test hooks
  this.getVideoMetaData = options.getVideoMetaData || getVideoMetaData;
  this.orientation = options.orientation || orientation;
  this.configStorage = options.configStorage || localStorage;

  this.cameraList = navigator.mozCameras.getListOfCameras();
  this.mozCamera = null;

  this.storage = options.storage || {};

  // Video config
  this.video = {
    filepath: null,
    minSpace: this.recordSpaceMin,
    spacePadding : this.recordSpacePadding
  };

  this.focus = new Focus(options.focus);

  // Indicate this first
  // load hasn't happened yet.
  this.isFirstLoad = true;

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

  // First load is different as we
  // fetch the mozCameraConfig from
  // the previous session and boot
  // with that to optimize startup.
  if (this.isFirstLoad) {
    this.firstLoad();
    return;
  }

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
    this.setupNewCamera(this.mozCamera);
    debug('camera not changed');
    return;
  }

  // If a camera is already loaded,
  // it must be 'released' first.
  // We also discard the `mozCameraConfig`
  // as the previous camera config
  // won't apply to the new camera.
  if (this.mozCamera) {
    this.mozCameraConfig = null;
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
    self.requestCamera(self.selectedCamera, self.mozCameraConfig);
    self.lastLoadedCamera = self.selectedCamera;
  }
};

/**
 * When the camera is loaded for the first
 * time run this specially optimized load path.
 *
 * We fetch the a previous camera config from storage
 * and request the camera *with* a configuration.
 *
 * This means that we get back a pre-configured
 * mozCamera and we don't have to run `.configure()`
 * on the critical path. This saves us ~400ms.
 *
 * @private
 */
Camera.prototype.firstLoad = function() {
  debug('first load');

  var config = this.fetchBootConfig() || {};
  var self = this;

  // Save this to memory so that we can re-request
  // the camera quickly after it has been .release()'d.
  this.mozCameraConfig = config.mozCameraConfig;

  // Request the camera, passing in the config.
  // If this is the first time the camera app
  // has been used `mozCameraConfig` will be undefined.
  this.requestCamera(this.selectedCamera, this.mozCameraConfig);

  // Set the pictureSize and recorderProfile
  // as soon as we get the camera hardware.
  // Set the `pictureSize` and `recorderProfile`
  // from the cache so that any subsequent requests
  // to `setPictureSize` and `setRecorderProfile`
  // don't trigger slow hardware configuration.
  this.once('newcamera', function() {
    var noConfigure = { configure: false };
    self.setPictureSize(config.pictureSize, noConfigure);
    self.setRecorderProfile(config.recorderProfile, noConfigure);
  });

  // First load is done.
  this.isFirstLoad = false;
};

/**
 * Save the current camera configuration
 * to persistent storage.
 *
 * This configuration is later used by
 * `.firstLoad()` to optimize the
 * first camera request.
 *
 * We only save the config if the camera
 * is using the 'back' camera in 'picture'
 * mode, as this is the mode we boot
 * the camera in. If partners have issues
 * with this, perhap we can make this
 * configurable.
 *
 * We're using localStorage because it's
 * currently the fastest option.
 *
 * @private
 */
Camera.prototype.saveBootConfig = function() {
  if (!this.cacheConfig) { return; }
  if (this.selectedCamera !== 'back') { return; }
  if (this.mode !== 'picture') { return; }
  // Store the things we need for quickLoad
  var json = {
    mozCameraConfig: this.mozCameraConfig,
    recorderProfile: this.recorderProfile,
    pictureSize: this.pictureSize
  };

  this.configStorage.setItem('cameraBootConfig', JSON.stringify(json));
  debug('saved camera config', json);
};

/**
 * Fetch the boot config from storage.
 *
 * We use this config to optimize the
 * first load of the camera on the
 * app's critical path.
 *
 * @return {Object}
 */
Camera.prototype.fetchBootConfig = function() {
  var string = this.configStorage.getItem('cameraBootConfig');
  var json = string && JSON.parse(string);
  debug('got camera config', json);
  return json;
};

/**
 * Requests the mozCamera object,
 * then configures it.
 *
 * @private
 */
Camera.prototype.requestCamera = function(camera, config) {
  debug('request camera', camera, config);
  if (this.isBusy) { return; }
  var self = this;

  // Indicate 'busy'
  this.busy('requestingCamera');

  // If a config was passed we assume
  // the camera has been configured.
  this.configured = !!config;

  navigator.mozCameras.getCamera(camera, config || {}, onSuccess, onError);
  debug('camera requested', camera, config);

  function onSuccess(mozCamera) {
    debug('successfully got mozCamera');
    self.setupNewCamera(mozCamera);
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

  function onError(err) {
    debug('error requesting camera', err);
    self.ready();
  }
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
  this.mozCamera.onShutter = this.onShutter;
  this.mozCamera.onPreviewStateChange = this.onPreviewStateChange;
  this.mozCamera.onRecorderStateChange = this.onRecorderStateChange;

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

  // Indicate 'busy'
  this.busy();

  // Create a new `mozCameraConfig`
  this.mozCameraConfig = {
    mode: this.mode,
    previewSize: this.previewSize(),
    recorderProfile: this.recorderProfile
  };

  // Configure the camera hardware
  this.mozCamera.setConfiguration(this.mozCameraConfig, onSuccess, onError);
  debug('mozCamera configuring', this.mozCameraConfig);

  function onSuccess() {
    debug('configuration success');
    if (!self.mozCamera) { return; }
    self.configureFocus();
    self.resumeFocus();
    self.configured = true;
    self.saveBootConfig();
    self.emit('configured');
    self.ready();
  }

  function onError() {
    debug('Error configuring camera');
    self.configured = true;
    self.ready();
  }
};

Camera.prototype.configureFocus = function() {
  var focusMode;
  // Determines focus mode based on camera mode
  // If we're taking still pictures, and C-AF is enabled
  if (this.mode === 'picture') {
    focusMode = 'continuous-picture';
  } else if (this.mode === 'video'){
    focusMode = 'continuous-video';
  }
  this.focus.configure(this.mozCamera, focusMode);
  this.focus.onFacesDetected = this.onFacesDetected;
  this.focus.onAutoFocusChanged = this.onAutoFocusChanged;
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
  var sizes = this.previewSizes();
  var profile = this.resolution();
  var size = CameraUtils.getOptimalPreviewSize(sizes, profile);
  debug('get optimal previewSize', size);
  return size;
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

  this.mozCamera.setPictureSize(size);
  this.pictureSize = size;
  this.setThumbnailSize();

  // Configure the hardware only when required
  if (configure) { this.configure(); }

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
 *
 * @param {String} key
 */
Camera.prototype.setFlashMode = function(key) {
  if (this.mozCamera) {
    // If no key was provided, set it to 'off' which is
    // a valid flash mode.
    key = key || 'off';

    this.mozCamera.flashMode = key;
    debug('flash mode set: %s', key);
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

  // Ignore if there is no loaded camera
  if (!this.mozCamera) {
    done();
    return;
  }

  this.busy();
  this.stopRecording();
  this.focus.stopFaceDetection();
  this.set('focus', 'none');
  this.mozCamera.release(onSuccess, onError);
  this.releasing = true;
  this.mozCamera = null;

  function onSuccess() {
    debug('successfully released');
    self.ready();
    self.emit('released');
    self.releasing = false;
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
 *  public
 */
Camera.prototype.capture = function(options) {
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
  debug('take picture');
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
    this.set('focus', 'focusing');
    this.focus.focus(onFocused);
  } else {
    takePicture();
  }

  function onFocused(state) {
    self.set('focus', state);
    takePicture();
  }

  function takePicture() {
    self.busy('takingPicture');
    self.mozCamera.takePicture(config, onSuccess, onError);
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
    // If we are in C-AF mode, we have
    // to call resume() in order to get
    // the camera to resume focusing
    // on what we point it at.
    self.resumeFocus();
    self.set('focus', 'none');
    self.ready();
  }
};

Camera.prototype.updateFocusArea = function(rect, done) {
  var self = this;
  this.set('focus', 'focusing');
  this.focus.updateFocusArea(rect, focusDone);
  function focusDone(state) {
    self.set('focus', state);
    if (done) {
      done(state);
    }
  }
};

Camera.prototype.stopFocus = function() {
  this.focus.stop();
};

Camera.prototype.resumeFocus = function() {
  this.focus.resume();
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
Camera.prototype.setVideoStorage = function(storage) {
  this.storage.video = storage;
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

  this.busy();

  // Lock orientation during video recording
  //
  // REVIEW: This should *not* be here. This
  // is an App concern and should live in
  // the `CameraController`.
  this.orientation.stop();

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
      self.emit('willrecord');
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
  var filepath = this.video.filepath;
  var storage = this.storage.video;
  var self = this;

  if (notRecording) { return; }

  this.busy();
  this.stopVideoTimer();
  this.mozCamera.stopRecording();
  this.set('recording', false);

  // Unlock orientation when stopping video recording.
  // REVIEW:WP This logic is out of scope of the
  // Camera hardware. Only the App should be
  // making such high level decicions.
  this.orientation.start();

  // Register a listener for writing
  // completion of current video file
  storage.addEventListener('change', onStorageChange);

  function onStorageChange(e) {
    // If the storage becomes unavailable
    // For instance when yanking the SD CARD
    if (e.reason === 'unavailable') {
      storage.removeEventListener('change', onStorageChange);
      self.emit('ready');
      return;
    }
    debug('video file ready', e.path);
    var matchesFile = e.path.indexOf(filepath) > -1;

    // Regard the modification as video file writing
    // completion if e.path matches current video
    // filename. Note e.path is absolute path.
    if (e.reason !== 'modified' || !matchesFile) { return; }

    // We don't need the listener anymore.
    storage.removeEventListener('change', onStorageChange);

    // Re-fetch the blob from storage
    var req = storage.get(filepath);
    req.onerror = self.onRecordingError;
    req.onsuccess = onSuccess;

    function onSuccess() {
      debug('got video blob');
      self.onNewVideo({
        blob: req.result,
        filepath: filepath
      });
    }
  }
};

/**
 * Once we have got the new video blob
 * from storage we assemble the video
 * object and then get video meta data
 * to add to it.
 *
 * If the video was too short, we delete
 * it from storage and abort to prevent
 * the app from ever knowing a new
 * (potentially corrupted) video file
 * was recorded.
 *
 * @param  {Object} video
 * @private
 */
Camera.prototype.onNewVideo = function(video) {
  debug('got new video', video);

  var elapsedTime = this.get('videoElapsed');
  var tooShort = elapsedTime < this.minRecordingTime;
  var self = this;

  // Discard videos that are too
  // short and possibly corrupted.
  if (tooShort) {
    debug('video too short, deleting...');
    this.storage.video.delete(video.filepath);
    this.ready();
    return;
  }

  // Finally extract some metadata before
  // telling the app the new video is ready.
  this.getVideoMetaData(video.blob, gotVideoMetaData);

  function gotVideoMetaData(error, data) {
    if (error) {
      self.onRecordingError();
      return;
    }

    // Bolt on additional metadata
    video.poster = data.poster;
    video.width = data.width;
    video.height = data.height;
    video.rotation = data.rotation;

    // Tell the app the new video is ready
    self.emit('newvideo', video);
    self.ready();
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
  this.emit('preview:' + state);
  if (busy) { this.busy(); }
  else { this.ready(); }
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
  done(Date.now() + '_tmp.3gp');
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
  this.emit('zoomconfigured');
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
};

/**
 * A central place to indicate
 * the camera is 'ready'.
 *
 * @private
 */
Camera.prototype.ready = function() {
  debug('ready');
  this.isBusy = false;
  this.emit('ready');
};

});
