define(function(require, exports, module) {
/*global CONFIG_MAX_IMAGE_PIXEL_SIZE*/
/*jshint laxbreak:true*/
'use strict';

/**
 * Dependencies
 */

var createVideoPosterImage = require('lib/create-video-poster-image');
var constants = require('config/camera');
var orientation = require('orientation');
var broadcast = require('broadcast');
var Model = require('vendor/model');
var evt = require('vendor/evt');
var dcf = require('dcf');

/**
 * Locals
 */

var CAMERA = constants.CAMERA_MODE_TYPE.CAMERA;
var VIDEO = constants.CAMERA_MODE_TYPE.VIDEO;
var FOCUS_MODE_TYPE = constants.FOCUS_MODE_TYPE;
var RECORD_SPACE_MIN = constants.RECORD_SPACE_MIN;
var RECORD_SPACE_PADDING = constants.RECORD_SPACE_PADDING;
var ESTIMATED_JPEG_FILE_SIZE = constants.ESTIMATED_JPEG_FILE_SIZE;
var MIN_RECORDING_TIME = constants.MIN_RECORDING_TIME;
var proto = evt.mix(Camera.prototype);

/**
 * Exports
 */

module.exports = Camera;

/**
 * The interface to
 * the camera hardware.
 *
 * TODO:
 *
 * - Move all state into this.state model.
 * - Introduce a camera controller to
 *   wire the camera into the app.
 *
 * @constructor
 */
function Camera() {
  this.state = new Model({
    mode: null,
    cameraNumber: 0,
    autoFocusSupported: false,
    manuallyFocused: false,
    recording: false,
    previewActive: false
  });

  this.videoTimer = null;

  // file path relative
  // to video root directory
  this._videoPath = null;

  // video root directory string
  this._videoRootDir = null;
  this._autoFocusSupport = {};
  this._cameraObj = null;
  this._pictureSize = null;
  this._previewConfig = null;

  // We can recieve multiple
  // 'FileSizeLimitReached' events
  // when recording; since we stop
  // recording on this event only
  // show one alert per recording
  this._sizeLimitAlertActive = false;

  // Holds the configuration
  // and current flash state.
  this.flash = {

    // Our predetermined configuration
    // for camera and video flash
    config: {
      camera: {
        defaultMode: 'auto',
        supports: ['off', 'auto', 'on']
      },
      video: {
        defaultMode: 'off',
        supports: ['off', 'torch']
      }
    },

    // All flash hardware modes
    // on this current camera.
    all: [],

    // Flash modes currently
    // available with the current
    // combination of hardware
    // and capture mode.
    available: [],

    // The index of the current
    // flash in the avaiable list.
    current: null
  };

  this.fileFormat = 'jpeg';
  this.preferredRecordingSizes = null;

  this._pendingPick = null;
  this._savedMedia = null;

  // Bind context
  this.updateVideoElapsed = this.updateVideoElapsed.bind(this);
  this.onStorageChange = this.onStorageChange.bind(this);
  this.storageCheck = this.storageCheck.bind(this);

  // Whenever the camera is
  // configured, we run a storage
  // check to determine whether
  // we have enough space to
  // accomodate a photograph.
  this.on('configured', this.storageCheck);

  this.configureStorage();
}

proto.configureStorage = function() {
  this._pictureStorage = navigator.getDeviceStorage('pictures');
  this._videoStorage = navigator.getDeviceStorage('videos'),
  this._pictureStorage.addEventListener('change', this.onStorageChange);
};

/**
 * Returns the current
 * capture mode.
 *
 * @return {String} 'camera'|'video'
 */
proto.getMode = function() {
  return this.state.get('mode');
};

/**
 * States if the camera is
 * in 'camera' capture mode.
 *
 * @return {Boolean}
 */
proto.isCameraMode = function() {
  return this.getMode() === CAMERA;
};

/**
 * States if the camera is
 * in 'video' capture mode.
 *
 * @return {Boolean}
 */
proto.isVideoMode = function() {
  return this.getMode() === VIDEO;
};

/**
 * Toggles between 'camera'
 * and 'video' capture modes.
 *
 * @return {String}
 */
proto.toggleMode = function() {
  var newMode = this.isCameraMode() ? VIDEO : CAMERA;
  this.setCaptureMode(newMode);
  this.configureFlashModes(this.flash.all);
  return newMode;
};

/**
 * Sets the capture mode.
 *
 * @param {String} mode
 *
 */
proto.setCaptureMode = function(mode) {
  this.state.set('mode', mode);
  return mode;
};

/**
 * Toggles the camera number
 * between back (0) and front(1).
 *
 * @return {Number}
 */
proto.toggleCamera = function() {
  var cameraNumber = 1 - this.state.get('cameraNumber');
  this.state.set('cameraNumber', cameraNumber);
  return cameraNumber;
};

/**
 * Cycles through flash
 * modes available for the
 * current camera (0/1) and
 * capture mode ('camera'/'video')
 * combination.
 *
 * @return {String}
 */
proto.toggleFlash = function() {
  var available = this.flash.available;
  var current = this.flash.current;
  var l = available.length;
  var next = (current + 1) % l;
  var name = available[next];

  this.setFlashMode(next);
  return name;
};

/**
 * Gets the name of the
 * current flash mode.
 *
 * @return {String}
 */
proto.getFlashMode = function() {
  var index = this.flash.current;
  return this.flash.available[index];
};

/**
 * Sets the current flash mode,
 * both on the Camera instance
 * and on the cameraObj hardware.
 *
 * @param {Number} index
 */
proto.setFlashMode = function(index) {
  var name = this.flash.available[index];
  this._cameraObj.flashMode = name;
  this.flash.current = index;
};

/**
 * States if the current
 * device has a front camera.
 *
 * @return {Boolean}
 */
proto.hasFrontCamera = function() {
  return this.numCameras > 1;
};

proto.setFocusMode = function() {
  this._callAutoFocus = false;

  // Camera
  if (this.isCameraMode()) {
    if (this._autoFocusSupport[FOCUS_MODE_TYPE.CONTINUOUS_CAMERA]) {
      this._cameraObj.focusMode = FOCUS_MODE_TYPE.CONTINUOUS_CAMERA;
      return;
    }

  // Video
  } else {
    if (this._autoFocusSupport[FOCUS_MODE_TYPE.CONTINUOUS_VIDEO]) {
      this._cameraObj.focusMode = FOCUS_MODE_TYPE.CONTINUOUS_VIDEO;
      return;
    }
  }

  if (this._autoFocusSupport[FOCUS_MODE_TYPE.MANUALLY_TRIGGERED]) {
    this._cameraObj.focusMode = FOCUS_MODE_TYPE.MANUALLY_TRIGGERED;
    this._callAutoFocus = true;
  }
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
proto.capture = function(options) {
  var self = this;

  // Camera
  if (this.isCameraMode()) {
    this.prepareTakePicture(function() {
      self.takePicture(options);
    });
  }

  // Video (stop)
  else if (this.state.get('recording')) {
    this.stopRecording();
  }

  // Video (start)
  else {
    this.startRecording();
  }
};

proto.startRecording = function() {
  var self = this;

  this._sizeLimitAlertActive = false;

  dcf.createDCFFilename(
    this._videoStorage,
    'video',
    onFileNameCreated);

  function onFileNameCreated(path, name) {
    self._videoPath = path + name;

    // The CameraControl API will not automatically create directories
    // for the new file if they do not exist, so write a dummy file
    // to the same directory via DeviceStorage to ensure that the directory
    // exists before recording starts.
    var dummyblob = new Blob([''], {type: 'video/3gpp'});
    var dummyfilename = path + '.' + name;
    var req = self._videoStorage.addNamed(dummyblob, dummyfilename);

    req.onerror = onError;
    req.onsuccess = function(e) {

      // Extract video
      // root directory string
      var absolutePath = e.target.result;
      var rootDirLength = absolutePath.length - dummyfilename.length;
      self._videoRootDir = absolutePath.substring(0, rootDirLength);

      // No need to wait for success
      self._videoStorage.delete(absolutePath);

      // Determine the number
      // of bytes available on disk.
      var spaceReq = self._videoStorage.freeSpace();
      spaceReq.onerror = onError;
      spaceReq.onsuccess = function() {
        startRecording(spaceReq.result);
      };
    };
  }

  function onError() {
    var id = 'error-recording';
    alert(
      navigator.mozL10n.get(id + '-title') + '. ' +
      navigator.mozL10n.get(id + '-text'));
  }

  function onSuccess() {
    self.state.set('recording', true);
    self.startRecordingTimer();

    // User closed app while
    // recording was trying to start
    if (document.hidden) {
      self.stopRecording();
    }

    // If the duration is too short,
    // the nno track may have been recorded.
    // That creates corrupted video files.
    // Because media file needs some samples.
    //
    // To have more information on video track,
    // we wait for 500ms to have few video and
    // audio samples, see bug 899864.
    window.setTimeout(function() {

      // TODO: Disable then re-enable
      // capture button after 500ms

    }, MIN_RECORDING_TIME);
  }

  function startRecording(freeBytes) {
    if (freeBytes < RECORD_SPACE_MIN) {
      onError('nospace');
      return;
    }

    var pickData = self._pendingPick && self._pendingPick.source.data;
    var maxFileSizeBytes = pickData && pickData.maxFileSizeBytes;
    var config = {
      rotation: orientation.get(),
      maxFileSizeBytes: freeBytes - RECORD_SPACE_PADDING
    };

    // If this camera session was
    // instantiated by a 'pick' activity,
    // it may have specified a maximum
    // file size. If so, use it.
    if (maxFileSizeBytes) {
      config.maxFileSizeBytes = Math.min(
        config.maxFileSizeBytes,
        maxFileSizeBytes);
    }

    // Finally begin recording
    self._cameraObj.startRecording(
      config,
      self._videoStorage,
      self._videoPath,
      onSuccess,
      onError);

    self.emit('recordingstart');
  }
};

/**
 * Sets a start time and begins
 * updating the elapsed time
 * every second.
 *
 */
proto.startRecordingTimer = function() {
  this.state.set('videoStart', new Date().getTime());
  this.videoTimer = setInterval(this.updateVideoElapsed, 1000);
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
proto.updateVideoElapsed = function() {
  var now = new Date().getTime();
  var start = this.state.get('videoStart');
  this.state.set('videoElapsed', (now - start));
};

proto.stopRecording = function() {
  var filename = this._videoRootDir + this._videoPath;
  var videoStorage = this._videoStorage;
  var self = this;

  this._cameraObj.stopRecording();
  this.state.set('recording', false);
  clearInterval(this.videoTimer);
  this.emit('recordingend');

  // Register a listener for writing
  // completion of current video file
  videoStorage.addEventListener('change', onVideoStorageChange);

  function onVideoStorageChange(e) {

    // Regard the modification as
    // video file writing completion
    // if e.path matches current video
    // filename. Note e.path is absolute path.
    if (e.reason === 'modified' && e.path === filename) {
      // Un-register the listener
      videoStorage.removeEventListener('change', onVideoStorageChange);
      getBlobFromStorage();
    }
  }

  function getBlobFromStorage() {
    var req = videoStorage.get(filename);

    req.onsuccess = onSuccess;
    req.onerror = onError;

    function onSuccess() {
      var blob = req.result;

      createVideoPosterImage(blob, filename, function(err, data) {
        if (err) {
          // We need to delete all corrupted
          // video files, those of them may be
          // tracks without samples (Bug 899864).
          self._videoStorage.delete(filename);
          return;
        }

        self.emit('newvideo', {
          blob: blob,
          filename: filename,
          poster: data.poster,
          width: data.width,
          height: data.height,
          rotation: data.rotation
        });
      });
    }

    function onError() {
      console.warn('getBlobFromStorage:', filename);
    }
  }
};

/**
 * Loads a camera stream
 * into a given video element.
 *
 * @param  {Element}   videoEl
 * @param  {Function} done
 */
proto.loadStreamInto = function(videoEl, done) {
  var cameraNumber = this.state.get('cameraNumber');
  var self = this;

  this.loadCameraPreview(cameraNumber, function(stream) {
    videoEl.mozSrcObject = stream;

    // Even though we have the stream now,
    // the camera hardware hasn't started
    // displaying it yet.
    //
    // We need to wait until the preview
    // has actually started displaying
    // before calling the callback.
    //
    // Bug 890427.
    self._cameraObj.onPreviewStateChange = function(state) {
      if (state === 'started') {
        self._cameraObj.onPreviewStateChange = null;
        done();
      }
    };
  });
};

proto.loadCameraPreview = function(cameraNumber, callback) {
  var mozCameras = navigator.mozCameras;
  var cameras = mozCameras.getListOfCameras();
  var self = this;

  // Store camera count
  this.numCameras = cameras.length;

  function gotPreviewScreen(stream) {
    self.state.set('previewActive', true);

    if (callback) {
      callback(stream);
    }
  }

  function gotCamera(camera) {
    var availableThumbnailSizes = camera.capabilities.thumbnailSizes;
    var focusModes = camera.capabilities.focusModes;
    var autoFocusSupported = !!~focusModes.indexOf('auto');
    var thumbnailSize;

    // Store the Gecko
    // camera interface
    self._cameraObj = camera;

    self.state.set('autoFocusSupported', autoFocusSupported);
    self.pickPictureSize(camera);

    thumbnailSize = self.selectThumbnailSize(
      availableThumbnailSizes,
      self._pictureSize);

    if (thumbnailSize) {
      camera.thumbnailSize = thumbnailSize;
    }

    self.getPreferredSizes(function() {
      var recorderProfiles = camera.capabilities.recorderProfiles;
      var videoProfile = self.pickVideoProfile(recorderProfiles);

      // 'Video' Mode
      if (self.isVideoMode()) {
        videoProfile.rotation = orientation.get();
        camera.getPreviewStreamVideoMode(videoProfile, gotPreviewScreen);
      }
    });

    self.enableCameraFeatures(camera.capabilities);

    camera.onShutter = function() {
      self.emit('shutter');
    };

    // 'Camera' Mode
    if (self.isCameraMode()) {
      camera.getPreviewStream(
        self._previewConfig,
        gotPreviewScreen.bind(self));
    }

    // This allows viewfinder to update
    // the size of the video element.
    self.emit('cameraChange', camera);
  }

  // If there is already a
  // camera, we would have
  // to release it first.
  if (this._cameraObj) {
    this.release(getCamera);
  } else {
    getCamera();
  }

  function getCamera() {
    var config = { camera: cameras[cameraNumber] };
    navigator.mozCameras.getCamera(config, gotCamera);
  }
};

proto.recordingStateChanged = function(msg) {
  if (msg === 'FileSizeLimitReached' && !this.sizeLimitAlertActive) {
    this.stopRecording();
    this.sizeLimitAlertActive = true;
    var alertText = this._pendingPick ? 'activity-size-limit-reached' :
      'storage-size-limit-reached';
    alert(navigator.mozL10n.get(alertText));
    this.sizeLimitAlertActive = false;
  }
};

proto.configureFlashModes = function(allModes) {
  this.flash.all = allModes || [];

  var cameraMode = this.getMode();
  var config = this.flash.config[cameraMode];
  var supported = config.supports;
  var index;

  this.flash.available = this.flash.all.filter(function(mode) {
    return !!~supported.indexOf(mode);
  });

  // Decide on the initial mode
  index = this.flash.available.indexOf(config.defaultMode);
  if (!~index) { index = 0; }

  this.setFlashMode(index);
};

proto.configureFocusModes = function(focusModes) {
  if (!focusModes) {
    return;
  }

  var MANUALLY_TRIGGERED = FOCUS_MODE_TYPE.MANUALLY_TRIGGERED;
  var CONTINUOUS_CAMERA = FOCUS_MODE_TYPE.CONTINUOUS_CAMERA;
  var CONTINUOUS_VIDEO = FOCUS_MODE_TYPE.CONTINUOUS_VIDEO;
  var support = this._autoFocusSupport;

  support[MANUALLY_TRIGGERED] = !!~focusModes.indexOf(MANUALLY_TRIGGERED);
  support[CONTINUOUS_CAMERA] = !!~focusModes.indexOf(CONTINUOUS_CAMERA);
  support[CONTINUOUS_VIDEO] = !!~focusModes.indexOf(CONTINUOUS_VIDEO);
};

proto.enableCameraFeatures = function(capabilities) {
  this.configureFlashModes(capabilities.flashModes);
  this.configureFocusModes(capabilities.focusModes);
  this.emit('configured');
};

proto.startPreview = function() {
  var cameraNumber = this.state.get('cameraNumber');
  this.loadCameraPreview(cameraNumber, null);
};

proto.resumePreview = function() {
  this._cameraObj.resumePreview();
  this.state.set('previewActive', true);
  this.emit('previewResumed');
};

proto.takePictureError = function() {
  alert(
    navigator.mozL10n.get('error-saving-title') + '. ' +
    navigator.mozL10n.get('error-saving-text'));
};

proto.takePictureSuccess = function(blob) {
  this.state.set({
    manuallyFocused: false,
    focusState: 'none'
  });

  this.emit('newimage', { blob: blob });
};

proto._addPictureToStorage = function(blob, callback) {
  var self = this;

  dcf.createDCFFilename(
    this._pictureStorage,
    'image',
    onFilenameCreated);

  function onFilenameCreated(path, name) {
    var addreq = self._pictureStorage.addNamed(blob, path + name);

    addreq.onerror = self.takePictureError;
    addreq.onsuccess = function(e) {
      var absolutePath = e.target.result;
      callback(path + name, absolutePath);
    };
  }
};

proto._resizeBlobIfNeeded = function(blob, callback) {
  var pickData = this._pendingPick.source.data;
  var pickWidth = pickData.width;
  var pickHeight = pickData.height;

  if (!pickWidth || !pickHeight) {
    callback(blob);
    return;
  }

  var img = new Image();
  img.onload = function resizeImg() {
    var canvas = document.createElement('canvas');
    canvas.width = pickWidth;
    canvas.height = pickHeight;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, pickWidth, pickHeight);
    canvas.toBlob(function toBlobSuccess(resized_blob) {
      callback(resized_blob);
    }, 'image/jpeg');
  };
  img.src = window.URL.createObjectURL(blob);
};

proto.storageCheck = function(done) {
  done = done || function() {};

  var self = this;

  this.getDeviceStorageState(function(result) {
    self.setStorageState(result);
    if (!self.storageAvailable()) {
      return done();
    }

    self.isSpaceOnStorage(function(result) {
      if (!result) {
        self.setStorageState('nospace');
      }
      done();
    });
  });
};

proto.getDeviceStorageState = function(done) {
  var req = this._pictureStorage.available();
  req.onsuccess = function(e) {
    done(e.target.result);
  };
};

proto.storageAvailable = function() {
  return this.state.get('storage') === 'available';
};

proto.isSpaceOnStorage = function(done) {
  var pictureWidth = this._pictureSize.width;
  var pictureHeight = this._pictureSize.height;
  var MAX_IMAGE_SIZE = (pictureWidth * pictureHeight * 4) + 4096;
  var req = this._pictureStorage.freeSpace();
  req.onsuccess = function(e) {
    var freeSpace = e.target.result;
    done(freeSpace > MAX_IMAGE_SIZE);
  };
};

proto.onStorageChange = function(e) {
  var value = e.reason;

  // Remove filmstrip item if its
  // correspondent file is deleted
  if (value === 'deleted') {
    broadcast.emit('itemDeleted', { path: e.path });
  } else {
    this.setStorageState(value);
  }

  // Check storage
  // has spare capacity
  this.storageCheck();
};

proto.setStorageState = function(value) {
  this.state.set('storage', value);
};

proto.prepareTakePicture = function(done) {
  var self = this;

  this.emit('preparingToTakePicture');

  if (!this._autoFocusSupport[FOCUS_MODE_TYPE.MANUALLY_TRIGGERED]) {
    done();
    return;
  }

  this.state.set('focusState', 'focusing');
  this._cameraObj.autoFocus(function(success) {
    if (!success) {
      self.state.set('focusState', 'fail');
      self.emit('focusFailed');

      window.setTimeout(function() {
        self.state.set('focusState', 'none');
      }, 1000);

      return;
    }

    self.state.set('focusState', 'focused');
    done();
  });
};

proto.takePicture = function(options) {
  var position = options && options.position;
  var config = {
    rotation: orientation.get(),
    dateTime: Date.now() / 1000,
    fileFormat: this.fileFormat
  };

  // If position has been
  // passed in, add it to
  // the config object.
  if (position) {
    config.position = position;
  }

  this._cameraObj.pictureSize = this._pictureSize;

  this._cameraObj.takePicture(
    config,
    this.takePictureSuccess.bind(this),
    this.takePictureError);
};

proto.selectThumbnailSize = function(thumbnailSizes, pictureSize) {
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

proto.pickPictureSize = function(camera) {
  var targetSize = null;
  var targetFileSize = 0;
  var pictureSizes = camera.capabilities.pictureSizes;

  if (this._pendingPick && this._pendingPick.source.data.maxFileSizeBytes) {

    // We use worse case of all
    // compression method: gif, jpg, png
    targetFileSize = this._pendingPick.source.data.maxFileSizeBytes;
  }

  if (this._pendingPick && this._pendingPick.source.data.width &&
      this._pendingPick.source.data.height) {

    // if we have pendingPick
    // with width and height,
    // set it as target size.
    targetSize = {
      width: this._pendingPick.source.data.width,
      height: this._pendingPick.source.data.height
    };
  }

  // CONFIG_MAX_IMAGE_PIXEL_SIZE is
  // maximum image resolution for still
  // photos taken with camera.
  //
  // It's from config.js which is
  // generatedin build time, 5 megapixels
  // by default (see build/application-data.js).
  // It should be synced with Gallery app
  // and update carefully.
  var maxRes = CONFIG_MAX_IMAGE_PIXEL_SIZE;
  var size = pictureSizes.reduce(function(acc, size) {
    var mp = size.width * size.height;

    // we don't need the
    // resolution larger
    // than maxRes
    if (mp > maxRes) {
      return acc;
    }

    // We assume the relationship
    // between MP to file size is
    // linear. This may be
    // inaccurate on all cases.
    var estimatedFileSize = mp * ESTIMATED_JPEG_FILE_SIZE / maxRes;
    if (targetFileSize > 0 && estimatedFileSize > targetFileSize) {
      return acc;
    }

    if (targetSize) {

      // find a resolution both width
      // and height are large than pick size
      if (size.width < targetSize.width || size.height < targetSize.height) {
        return acc;
      }

      // it's first pictureSize.
      if (!acc.width || acc.height) {
        return size;
      }

      // find large enough but
      // as small as possible.
      return (mp < acc.width * acc.height) ? size : acc;
    } else {

      // no target size, find
      // as large as possible.
      return (mp > acc.width * acc.height && mp <= maxRes) ? size : acc;
    }
  }, {width: 0, height: 0});

  if (size.width === 0 && size.height === 0) {
    this._pictureSize = pictureSizes[0];
  } else {
    this._pictureSize = size;
  }
};

proto.pickVideoProfile = function(profiles) {
  var matchedProfileName;
  var profileName;

  if (this.preferredRecordingSizes) {
    for (var i = 0; i < this.preferredRecordingSizes.length; i++) {
      if (this.preferredRecordingSizes[i] in profiles) {
        matchedProfileName = this.preferredRecordingSizes[i];
        break;
      }
    }
  }

  // Attempt to find low resolution profile if accessed via pick activity
  if (this._pendingPick && this._pendingPick.source.data.maxFileSizeBytes &&
      'qcif' in profiles) {
    profileName = 'qcif';
  } else if (matchedProfileName) {
    profileName = matchedProfileName;
  // Default to cif profile
  } else if ('cif' in profiles) {
    profileName = 'cif';
  // Fallback to first valid profile if none found
  } else {
    profileName = Object.keys(profiles)[0];
  }

  return {
    profile: profileName,
    rotation: 0,
    width: profiles[profileName].video.width,
    height: profiles[profileName].video.height
  };
};

/**
 * Releases the camera hardware.
 *
 * @param  {Function} done
 *
 */
proto.release = function(done) {
  done = done || function() {};

  if (!this._cameraObj) {
    return;
  }

  var self = this;
  this._cameraObj.release(onSuccess, onError);

  function onSuccess() {
    self._cameraObj = null;
    done();
  }

  function onError() {
    console.warn('Camera: failed to release hardware?');
    done();
  }
};

proto.getPreferredSizes = function(done) {
  done = done || function() {};

  var key = 'camera.recording.preferredSizes';
  var self = this;

  if (this.preferredRecordingSizes) {
    done(this.preferredRecordingSizes);
    return;
  }

  var req = navigator.mozSettings.createLock().get(key);
  req.onsuccess = function() {
    self.preferredRecordingSizes = req.result[key] || [];
    done(self.preferredRecordingSizes);
  };
};

});
