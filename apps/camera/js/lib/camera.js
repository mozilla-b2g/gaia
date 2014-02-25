define(function(require, exports, module) {
'use strict';

/**
 * Module Dependencies
 */

var getVideoMetaData = require('lib/get-video-meta-data');
var orientation = require('lib/orientation');
var constants = require('config/camera');
var debug = require('debug')('camera');
var bindAll = require('lib/bind-all');
var model = require('vendor/model');

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

/**
 * Plugs Video Stream into Video Element.
 *
 * @param  {Elmement} videoElement
 */
Camera.prototype.loadStreamInto = function(videoElement) {
  debug('loading stream into element');
  if (!this.mozCamera) { return; }

  // Don't load the same camera stream again
  var isCurrent = videoElement.mozSrcObject === this.mozCamera;
  if (isCurrent) { return debug('camera didn\'t change'); }

  videoElement.mozSrcObject = this.mozCamera;
  videoElement.play();
  debug('stream loaded into video');

  this.emit('streamLoaded');
  this.emit('ready');
};

Camera.prototype.load = function() {
  debug('load camera');

  var selectedCamera = this.get('selectedCamera');
  var loadingNewCamera = selectedCamera !== this.lastLoadedCamera;
  this.lastLoadedCamera = selectedCamera;
  this.emit('loading');

  // It just configures if the
  // camera has been previously loaded
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
  debug ('got camera');
  var capabilities = mozCamera.capabilities;
  this.mozCamera = mozCamera;
  this.mozCamera.onShutter = this.onShutter;
  this.mozCamera.onRecorderStateChange = self.onRecorderStateChange;
  this.configureFocus(capabilities.focusModes);
  this.set('capabilities', capabilities);
};

Camera.prototype.configure = function() {
  var self = this;
  var success = function() {
    self.emit('configured');
  };

  var error = function() {
    console.log('Error configuring camera');
  };

  var options = {
    mode: this.mode,
    previewSize: this.previewSize(),
    recorderProfile: this.recorderProfile.key
  };

  debug('mozCamera configuration pw: %s, ph: %s',
    options.previewSize.width,
    options.previewSize.height);

  this.mozCamera.setConfiguration(options, success, error);
};

Camera.prototype.previewSizes = function() {
  return this.mozCamera.capabilities.previewSizes;
};

Camera.prototype.previewSize = function() {
  var sizes = this.previewSizes();
  var profile = this.resolution();
  debug('resolution w: %s, h: %s', profile.width, profile.height);
  return this.pickPreviewSize(profile, sizes);
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

// Camera.prototype.configurePicturePreviewSize = function(previewSizes) {
//   if (!this.mozCamera) { return; }
//   var viewportSize;

//   // If no viewportSize provided it uses screen size.
//   viewportSize = this.viewportSize || {
//     width: window.innerWidth,
//     height: window.innerHeight
//   };

//   //this.picturePreviewSize = pickPreviewSize(viewportSize, previewSizes);
//   this.updatePreviewSize();
// };


Camera.prototype.pickPreviewSize = function(size, sizes) {
  var targetAspect = size.width / size.height;
  var l = sizes.length;
  var bestDelta;
  var aspect;
  var delta;
  var best;

  for (var i = 0; i < l; i++) {
    aspect = sizes[i].width / sizes[i].height;
    delta = Math.abs(targetAspect - aspect);
    if (!delta) { return sizes[i]; }
    if (!best || delta < bestDelta) {
      bestDelta = delta;
      best = sizes[i];
    }
  }

  return best;
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
  switch (this.mode) {
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
  this.setAutoFocus(onReady);

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
  }
};

Camera.prototype.setAutoFocus = function(done) {
  var self = this;
  // Check focus state. if it is
  // still focusing don't call one
  // more time.
  var focusState = this.get('focus');
  if (!this.autoFocus.auto || focusState === 'focusing') {
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

Camera.prototype.onPreviewStateChange = function(previewState) {
  if (previewState === 'stopped' || previewState === 'paused') {
    this.emit('busy');
  } else {
    this.emit('ready');
  }
};

Camera.prototype.onRecorderStateChange = function(msg) {
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
  this.mode = mode;
  return this;
};

// Camera.prototype.updatePreviewSize = function(mode) {
//   this.previewSize = mode === 'picture' ?
//     this.picturePreviewSize : this.videoPreviewSize;
// };

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
* To focus on user specified region
* of viewfinder set focus areas.
*
* @param  {object} rect
* The argument is an object that
* contains boundaries of focus area
* in camera coordinate system, where
* the top-left of the camera field
* of view is at (-1000, -1000), and
* bottom-right of the field at
* (1000, 1000).
*
**/
Camera.prototype.setFocusArea = function(rect) {
  this.mozCamera.focusAreas = [{
    top: rect.top,
    bottom: rect.bottom,
    left: rect.left,
    right: rect.right,
    weight: 1
  }];
};

/**
* To focus on user specified region
* of viewfinder set metering areas.
*
* @param  {object} rect
* The argument is an object that
* contains boundaries of metering area
* in camera coordinate system, where
* the top-left of the camera field
* of view is at (-1000, -1000), and
* bottom-right of the field at
* (1000, 1000).
*
**/
Camera.prototype.setMeteringArea = function(rect) {
  this.mozCamera.meteringAreas = [{
    top: rect.top,
    bottom: rect.bottom,
    left: rect.left,
    right: rect.right,
    weight: 1
  }];
};

/**
* Once touch focus is done
* clear the ring UI.
*
* Timeout is needed to show
* the focused UI for sometime
* before making it disappear.
**/
Camera.prototype.clearFocusRing = function() {
  var self = this;
  setTimeout(function() {
    self.set('focus', 'none');
  }, 1000);
};
});
