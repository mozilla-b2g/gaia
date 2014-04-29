define(function(require, exports, module) {
'use strict';

/**
 * Module Dependencies
 */

var CameraUtils = require('lib/camera-utils');
var getVideoMetaData = require('lib/get-video-meta-data');
var orientation = require('lib/orientation');
var debug = require('debug')('camera');
var bindAll = require('lib/bind-all');
var model = require('vendor/model');
var mix = require('lib/mixin');

/**
 * Locals
 */

var recordSpaceMin = window.RECORD_SPACE_MIN;
var recordSpacePadding = window.RECORD_SPACE_PADDING;

// More explicit names for the focus modes we care about
var MANUAL_AUTO_FOCUS = 'auto';
var CONTINUOUS_AUTO_FOCUS = 'continuous-picture';

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
 *   - {Boolean} `cacheConfig`
 *   - {Boolean} `cafEnabled`
 *
 * @param {Object} options
 */
function Camera(options) {
  debug('initializing');
  bindAll(this);

  // Options
  options = options || {};
  this.cacheConfig = !!options.cacheConfig;
  this.orientation = options.orientation || orientation; // test hook
  this.storage = options.storage  || localStorage; // test hook

  this.cameraList = navigator.mozCameras.getListOfCameras();
  this.mozCamera = null;
  this.video = {
    storage: navigator.getDeviceStorage('videos'),
    filepath: null,
    minSpace: options.recordSpaceMin || recordSpaceMin,
    spacePadding : options.recordSpacePadding || recordSpacePadding
  };

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

  // If the hardware supports continuous auto focus, we generally want to
  // use it. But we do have a option in the settings file to disable it
  // at build time.
  if (options.cafEnabled !== undefined) {
    this.cafEnabled = options.cafEnabled;
  } else {
    // If the option is not specified at all, assume true
    this.cafEnabled = true;
  }

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
  // If this is the first time the caemra app
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

  this.storage.setItem('cameraBootConfig', JSON.stringify(json));
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
  var string = this.storage.getItem('cameraBootConfig');
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
  var self = this;
  this.busy();

  // If a config was passed we assume
  // the camera has been configured.
  this.configured = !!config;

  navigator.mozCameras.getCamera(camera, config || {}, onSuccess, onError);
  debug('camera requested', camera, config);

  function onSuccess(mozCamera) {
    debug('successfully got mozCamera');
    self.setupNewCamera(mozCamera);
    self.ready();

    // If the camera was configured in the
    // `mozCamera.getCamera()` call, we can
    // fire the 'configured' event now.
    if (self.configured) { self.emit('configured'); }
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

  // Configure focus
  this.configureFocus(this.mode);

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
    self.configured = true;
    self.saveBootConfig();
    self.ready();
    self.emit('configured');
  }

  function onError() {
    console.log('Error configuring camera');
    self.configured = true;
    self.ready();
  }
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
  if (this.pictureSize) {
    var sameWidth = size.width === this.pictureSize.width;
    var sameHeight = size.height === this.pictureSize.height;
    if (sameWidth && sameHeight) {
      debug('pictureSize didn\'t change');
      return;
    }
  }

  this.mozCamera.pictureSize = size;
  this.pictureSize = size;
  this.setThumbnailSize();

  // Configure the hardware only when required
  if (configure) { this.configure(); }

  debug('pictureSize changed');
  return this;
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
  if (this.recorderProfile === key) {
    debug('recorderProfile didn\'t change');
    return;
  }

  this.recorderProfile = key;
  if (configure) { this.configure(); }

  debug('recorderProfile changed: %s', key);
  return this;
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
  var pictureSize = this.mozCamera.pictureSize;
  var picked = this.pickThumbnailSize(sizes, pictureSize);
  if (picked) { this.mozCamera.thumbnailSize = picked; }
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
  this.mozCamera.release(onSuccess, onError);
  this.releasing = true;
  this.mozCamera = null;

  function onSuccess() {
    self.releasing = false;
    self.ready();
    self.emit('released');
    debug('successfully released');
    done();
  }

  function onError(err) {
    debug('failed to release hardware');
    self.releasing = false;
    self.ready();
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

  var rotation = orientation.get();
  var selectedCamera = this.selectedCamera;
  var self = this;

  rotation = selectedCamera === 'front' ? -rotation : rotation;
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

  function onError(error) {
    var title = navigator.mozL10n.get('error-saving-title');
    var text = navigator.mozL10n.get('error-saving-text');
    // if taking a picture fails because there's already
    // a picture being taken we ignore it
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
    self.emit('newimage', image);
    debug('success taking picture');
    complete();
  }

  function complete() {
    // If we are in C-AF mode, we have to call resumeContinuousFocus() in
    // order to get the camera to resume focusing on what we point it at.
    if (self.mozCamera.focusMode === CONTINUOUS_AUTO_FOCUS) {
      self.mozCamera.resumeContinuousFocus();
    }

    self.set('focus', 'none');
    self.ready();
  }
};

/**
 * Focus the camera, invoke the callback asynchronously when done.
 *
 * If we only have fixed focus, then we call the callback right away
 * (but still asynchronously). Otherwise, we call autoFocus to focus
 * the camera and call the callback when focus is complete. In C-AF mode
 * this process should be fast. In manual AF mode, focusing takes about
 * a second and causes a noticeable delay before the picture is taken.
 *
 * @param  {Function} done
 * @private
 */
Camera.prototype.focus = function(done) {
  var self = this;
  var focusMode = this.mozCamera.focusMode;

  if (focusMode === MANUAL_AUTO_FOCUS || focusMode === CONTINUOUS_AUTO_FOCUS) {
    //
    // In either focus mode, we call autoFocus() to ensure that the user gets
    // a sharp picture. The difference between the two modes is that if
    // C-AF is on, it is likely that the camera is already focused, so the
    // call to autoFocus() invokes its callback very quickly and we get much
    // better response time.
    //
    // In either case, the callback is passed a boolean specifying whether
    // focus was successful or not, and we display a green or red focus ring
    // then call the done callback, which takes the picture and clears
    // the focus ring.
    //
    this.set('focus', 'focusing');     // white focus ring

    this.mozCamera.autoFocus(function(success) {
      if (success) {
        self.set('focus', 'focused');  // green focus ring
        done();
      }
      else {
        self.set('focus', 'fail');     // red focus ring
        done('failed');
      }
    });
  }
  else {
    // This is fixed focus: there is nothing we can do here so we
    // should just call the callback and take the photo. No focus
    // happens so we don't display a focus ring.
    setTimeout(done);
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
 * Start recording a video.
 *
 * @public
 */
Camera.prototype.startRecording = function(options) {
  debug('start recording');

  var frontCamera = this.selectedCamera === 'front';
  var rotation = this.orientation.get();
  var storage = this.video.storage;
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
 * @public
 */
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
  if (notRecording || elapsedTime < window.MIN_RECORDING_TIME) {
    return;
  }

  this.stopVideoTimer();
  this.mozCamera.stopRecording();
  this.set('recording', false);
  this.busy();

  // Unlock orientation when stopping video recording
  this.orientation.start();

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
  if (this.mode === mode) { return; }
  this.mode = mode;
  this.configure();
  return this;
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

Camera.prototype.configureFocus = function(captureMode) {
  var focusModes = this.capabilities.focusModes;

  // If we're taking still pictures, and C-AF is enabled and supported
  // (and gecko supports resumeContinuousFocus) then use C-AF.
  // XXX: once bug 986024 has landed and been uplifted we can remove
  // the check for resumeContinuousFocus support
  if (captureMode === 'picture') {
    if (this.cafEnabled &&
        focusModes.indexOf(CONTINUOUS_AUTO_FOCUS) >= 0 &&
        this.mozCamera.resumeContinuousFocus) {
      this.mozCamera.focusMode = CONTINUOUS_AUTO_FOCUS;
      return;
    }
  }

  // Otherwise, we'll use 'auto' mode, if it is supported.
  // We do this for video and still pictures. For videos, this mode
  // actually does continous focus and it seems to work better than
  // the actual 'continuous-video' mode.
  if (focusModes.indexOf(MANUAL_AUTO_FOCUS) >= 0) {
    this.mozCamera.focusMode = MANUAL_AUTO_FOCUS;
  }
  else {
    // If auto mode is not supported then we presumably have a fixed focus
    // camera. Just use the first available focus mode, and don't call
    // auto focus. This happens with the front-facing camera, typically
    this.mozCamera.focusMode = focusModes[0];
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
      if (self.selectedCamera === 'front') {
        self.set('maxHardwareZoom', 1);
      } else {
        self.set('maxHardwareZoom', 1.25);
      }
    }
  };

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
  this.mozCamera.zoom = zoom;
  this.emit('zoomchanged', zoom);
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

/**
 * A central place to indicate
 * the camera is 'busy'.
 *
 * @private
 */
Camera.prototype.busy = function() {
  debug('busy');
  this.isBusy = true;
  this.emit('busy');
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

function debounce(fn, ms) {
  var timeout;
  return function() {
    clearTimeout(timeout);
    timeout = setTimeout(fn, ms || 0);
  };
}

});
