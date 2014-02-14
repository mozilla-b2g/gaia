define(function(require, exports, module) {
'use strict';

/**
 * Module Dependencies
 */

var pickPreviewSize = require('lib/camera-utils').selectOptimalPreviewSize;
var getVideoMetaData = require('lib/get-video-meta-data');
var orientation = require('lib/orientation');
var getSizeKey = require('lib/get-size-key');
var constants = require('config/camera');
var debug = require('debug')('camera');
var bindAll = require('lib/bind-all');
var model = require('vendor/model');
var mixin = require('lib/mixin');

/**
 * Locals
 */

var RECORD_SPACE_MIN = constants.RECORD_SPACE_MIN;
var RECORD_SPACE_PADDING = constants.RECORD_SPACE_PADDING;

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
  this.autoFocus = {};
  this.tmpVideo = {
    storage: navigator.getDeviceStorage('videos'),
    filename: null,
    filepath: null
  };

  debug('initialized');
}

Camera.prototype.loadStreamInto = function(videoElement) {
  debug('loading stream into element');

  if (!this.mozCamera) {
    return;
  }

  // Plugs Video Stream in Video Element
  if (videoElement &&
      videoElement.mozSrcObject !== this.mozCamera) {
    videoElement.mozSrcObject = this.mozCamera;
    videoElement.play();
    debug('stream loaded');
    this.emit('streamLoaded');
    this.emit('ready');
  }
};

Camera.prototype.load = function() {
  var selectedCamera = this.get('selectedCamera');
  var loadingNewCamera = selectedCamera !== this.lastLoadedCamera;
  this.lastLoadedCamera = selectedCamera;
  this.emit('loading');
  // It just configures if the camera has been previously loaded
  if (this.mozCamera && !loadingNewCamera) {
    this.configure(this.mozCamera);
    return;
  }
  if (this.mozCamera) { // Camera previously loaded
    this.release(this.requestCamera);
  } else { // No camera previously loaded. App fresh start
    this.requestCamera();
  }
  debug('load camera: %s', selectedCamera);
};

Camera.prototype.requestCamera = function() {
  var selectedCamera = this.get('selectedCamera');
  navigator.mozCameras.getCamera(selectedCamera, {}, this.configure);
};

Camera.prototype.configure = function(mozCamera) {
  debug('configure');
  var self = this;
  var capabilities;
  var options;
  var success = function() {
    // Format the capabilites then pass them out via
    // the 'configured' event. This gives the application
    // a change to match device capabilities with app config.
    debug('configured');
    self.emit('configured', self.formatCapabilities(capabilities));
  };
  var error = function() {
    console.log('Error configuring camera');
  };

  if (!mozCamera) {
    return;
  }

  // Store the Gecko
  // mozCamera interface
  this.mozCamera = mozCamera;
  capabilities = mozCamera.capabilities;
  this.configureFocus(capabilities.focusModes);
  this.configurePicturePreviewSize(capabilities.previewSizes);
  // Bind to some hardware events
  mozCamera.onShutter = this.onShutter;
  mozCamera.onRecorderStateChange = self.onRecorderStateChange;
  options = {
    mode: this.get('mode'),
    previewSize: this.picturePreviewSize
  };
  if (this.videoProfile) {
    options.recorderProfile = this.videoProfile;
  }
  mozCamera.setConfiguration(options, success, error);
};

Camera.prototype.formatCapabilities = function(capabilities) {
  capabilities = mixin({}, capabilities);
  var pictureSizes = capabilities.pictureSizes;
  return mixin(capabilities, {
    pictureSizes: this.formatPictureSizes(pictureSizes)
  });
};

Camera.prototype.setPictureSize = function(value) {
  this.mozCamera.pictureSize = value;
  this.setThumbnailSize();
};

Camera.prototype.setThumbnailSize = function() {
  var sizes = this.mozCamera.capabilities.thumbnailSizes;
  var pictureSize = this.mozCamera.pictureSize;
  var picked = this.pickThumbnailSize(sizes, pictureSize);
  if (picked) { this.mozCamera.thumbnailSize = picked; }
};

Camera.prototype.formatPictureSizes = function(sizes) {
  var hash = {};
  sizes.forEach(function(size) {
    var key = getSizeKey.picture(size);
    hash[key] = size;
  });
  return hash;
};

Camera.prototype.setVideoProfile = function(profileName) {
  var capabilities = this.mozCamera.capabilities;
  var recorderProfile = capabilities.recorderProfiles[profileName].video;
  this.videoProfile = profileName;
  this.videoPreviewSize = {
    height: recorderProfile.height,
    width: recorderProfile.width
  };
  this.updatePreviewSize();
  debug('video profile configured', profileName);
};

Camera.prototype.configurePicturePreviewSize = function(availablePreviewSizes) {
  var viewportSize;
  if (!this.mozCamera) {
    return;
  }
  // If no viewportSize provided it uses screen size.
  viewportSize = this.viewportSize || {
    width: window.innerWidth,
    height: window.innerHeight
  };
  this.picturePreviewSize = pickPreviewSize(
    viewportSize,
    availablePreviewSizes);
  this.updatePreviewSize();
};

Camera.prototype.configureFocus = function(modes) {
  var supports = this.autoFocus;
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
  this.mozCamera.release(onSuccess, onError);

  function onSuccess() {
    debug('successfully released');
    self.mozCamera = null;
    done();
  }

  function onError() {
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
  switch (this.get('mode')) {
    case 'picture': this.takePicture(options); break;
    case 'video': this.toggleRecording(options); break;
  }
};

Camera.prototype.takePicture = function(options) {
  var self = this;
  var rotation = orientation.get();
  var selectedCamera = this.get('selectedCamera');
  rotation = selectedCamera === 'front'? -rotation: rotation;

  this.emit('busy');
  this.prepareTakePicture(onReady);

  function onReady() {
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

  function onSuccess(blob) {
    self.resumePreview();
    self.set('focus', 'none');
    self.emit('newimage', { blob: blob });
    self.emit('ready');
  }

  function onError() {
    var title = navigator.mozL10n.get('error-saving-title');
    var text = navigator.mozL10n.get('error-saving-text');
    alert(title + '. ' + text);
    self.emit('ready');
  }
};

Camera.prototype.prepareTakePicture = function(done) {
  var self = this;

  if (!this.autoFocus.auto) {
    done();
    return;
  }

  this.mozCamera.autoFocus(onFocus);
  this.set('focus', 'focusing');

  function onFocus(success) {
    if (success) {
      self.set('focus', 'focused');
      done();
      return;
    }

    // On failure
    self.set('focus', 'fail');
    setTimeout(reset, 1000);
    done();
  }

  function reset() {
    self.set('focus', 'none');
  }
};

Camera.prototype.toggleRecording = function(o) {
  var recording = this.get('recording');
  if (recording) { this.stopRecording(o); }
  else { this.startRecording(o); }
};

Camera.prototype.startRecording = function(options) {
  var storage = this.tmpVideo.storage;
  var mozCamera = this.mozCamera;
  var self = this;
  var rotation = orientation.get();
  var selectedCamera = this.get('selectedCamera');
  rotation = selectedCamera === 'front'? -rotation: rotation;


  // First check if there is enough free space
  this.getTmpStorageSpace(gotStorageSpace);

  function gotStorageSpace(err, freeBytes) {
    if (err) { return self.onRecordingError(); }

    var notEnoughSpace = freeBytes < RECORD_SPACE_MIN;
    var remaining = freeBytes - RECORD_SPACE_PADDING;
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

    self.tmpVideo.filename = self.createTmpVideoFilename();
    mozCamera.startRecording(
      config,
      storage,
      self.tmpVideo.filename,
      onSuccess,
      self.onRecordingError);
    }

    function onSuccess() {
      self.set('recording', true);
      self.startVideoTimer();

      // User closed app while
      // recording was trying to start
      if (document.hidden) {
        self.stopRecording();
      }

    }
};

Camera.prototype.stopRecording = function() {
  debug('stop recording');

  var notRecording = !this.get('recording');
  var filename = this.tmpVideo.filename;
  var storage = this.tmpVideo.storage;
  var self = this;

  if (notRecording) {
    return;
  }

  this.mozCamera.stopRecording();
  this.set('recording', false);
  this.stopVideoTimer();

  // Register a listener for writing
  // completion of current video file
  storage.addEventListener('change', onStorageChange);

  function onStorageChange(e) {
    debug('video file ready', e.path);
    var filepath = self.tmpVideo.filepath = e.path;
    var matchesFile = !!~filepath.indexOf(filename);

    // Regard the modification as
    // video file writing completion
    // if e.path matches current video
    // filename. Note e.path is absolute path.
    if (e.reason === 'modified' && matchesFile) {
      storage.removeEventListener('change', onStorageChange);
      self.getTmpVideoBlob(gotVideoBlob);
    }
  }

  function gotVideoBlob(blob) {
    getVideoMetaData(blob, function(err, data) {
      if (err) {
        return;
      }

      self.emit('newvideo', {
        blob: blob,
        poster: data.poster,
        width: data.width,
        height: data.height,
        rotation: data.rotation
      });
    });
  }
};

// TODO: This is UI stuff, so
// shouldn't be handled in this file.
Camera.prototype.onRecordingError = function(id) {
  id = id !== 'FAILURE' ? id : 'error-recording';
  var title = navigator.mozL10n.get(id + '-title');
  var text = navigator.mozL10n.get(id + '-text');
  alert(title + '. ' + text);
};

Camera.prototype.onShutter = function() {
  this.emit('shutter');
};

Camera.prototype.onRecordingStateChange = function(msg) {
  if (msg === 'FileSizeLimitReached') {
    this.emit('filesizelimitreached');
  }
};

Camera.prototype.getTmpStorageSpace = function(done) {
  debug('get temp storage space');

  var storage = this.tmpVideo.storage;
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

Camera.prototype.getTmpVideoBlob = function(done) {
  debug('get tmp video blob');

  var filepath = this.tmpVideo.filepath;
  var storage = this.tmpVideo.storage;
  var req = storage.get(filepath);
  req.onsuccess = onSuccess;
  req.onerror = onError;

  function onSuccess() {
    debug('got video blob');
    done(req.result);
  }

  function onError() {
    debug('failed to get \'%s\' from storage', filepath);
  }
};

Camera.prototype.createTmpVideoFilename = function() {
  return Date.now() + '_tmp.3gp';
};

Camera.prototype.deleteTmpVideoFile = function() {
  var storage = this.tmpVideo.storage;
  storage.delete(this.tmpVideo.filepath);
  this.tmpVideo.filename = null;
  this.tmpVideo.filepath = null;
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
  this.updatePreviewSize(mode);
  this.set('mode', mode);
  this.configure(this.mozCamera);
};

Camera.prototype.updatePreviewSize = function(mode) {
  this.previewSize = mode === 'picture' ?
    this.picturePreviewSize : this.videoPreviewSize;
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

});
