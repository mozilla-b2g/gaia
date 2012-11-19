'use strict';

var Camera = {

  _started: false,

  _cameras: null,
  _camera: 0,
  _captureMode: null,
  _recording: false,

  // In secure mode the user cannot browse to the gallery
  _secureMode: window.parent !== window,
  _currentOverlay: null,

  CAMERA: 'camera',
  VIDEO: 'video',

  THUMBNAIL_LIMIT: 4,

  _videoTimer: null,
  _videoStart: null,
  _videoPath: null,
  _videoPreview: document.createElement('video'),

  _autoFocusSupported: 0,
  _manuallyFocused: false,

  _timeoutId: 0,
  _cameraObj: null,

  _photosTaken: [],
  _cameraProfile: null,

  _filmStripShown: false,
  _filmStripTimer: null,
  _resumeViewfinderTimer: null,
  _waitingToGenerateThumb: false,

  _styleSheet: document.styleSheets[0],
  _orientationRule: null,
  _phoneOrientation: 0,

  _pictureStorage: navigator.getDeviceStorage('pictures'),
  _videoStorage: navigator.getDeviceStorage('videos'),
  _storageState: null,

  STORAGE_INIT: 0,
  STORAGE_AVAILABLE: 1,
  STORAGE_NOCARD: 2,
  STORAGE_UNMOUNTED: 3,
  STORAGE_CAPACITY: 4,

  _pictureSize: null,
  _previewPaused: false,
  _previewActive: false,

  PREVIEW_PAUSE: 500,

  _flashModes: [],
  _currentFlashMode: 0,

  _config: {
    fileFormat: 'jpeg'
  },

  get _previewConfig() {
    delete this._previewConfig;
    return this._previewConfig = {
      width: document.body.clientHeight,
      height: document.body.clientWidth
    };
  },

  _previewConfigVideo: {
    profile: 'cif',
    rotation: 90,
    width: 352,
    height: 288
  },

  _shutterKey: 'camera.shutter.enabled',
  _shutterSound: new Audio('./resources/sounds/shutter.ogg'),
  _shutterSoundEnabled: true,

  _dcfConfig: {
    key: 'dcf_key',
    seq: {file: 1, dir: 100},
    postFix: 'MZLLA',
    video: {prefix: 'VID_'},
    image: {prefix: 'IMG_'}
  },

  THUMB_WIDTH: 40,
  THUMB_HEIGHT: 40,

  // Because we dont want to wait for the geolocation query
  // before we can take a photo, we keep a track of the users
  // position, when the camera jumps into foreground or every
  // 10 minutes
  POSITION_TIMEOUT: 1000 * 60 * 10,
  _positionTimer: null,
  _position: null,

  _pendingPick: null,

  // The minimum available disk space to start recording a video.
  RECORD_SPACE_MIN: 1024 * 1024 * 2,

  // Number of bytes left on disk to let us stop recording.
  RECORD_SPACE_PADDING: 1024 * 1024 * 1,

  // Maximum image resolution for still photos taken with camera
  MAX_IMAGE_RES: 1024 * 768, // was: 1600*1200

  get overlayTitle() {
    return document.getElementById('overlay-title');
  },

  get overlayText() {
    return document.getElementById('overlay-text');
  },

  get overlay() {
    return document.getElementById('overlay');
  },

  get viewfinder() {
    return document.getElementById('viewfinder');
  },

  get switchButton() {
    return document.getElementById('switch-button');
  },

  get captureButton() {
    return document.getElementById('capture-button');
  },

  get galleryButton() {
    return document.getElementById('gallery-button');
  },

  get videoTimer() {
    return document.getElementById('video-timer');
  },

  get focusRing() {
    return document.getElementById('focus-ring');
  },

  get filmStrip() {
    return document.getElementById('film-strip');
  },

  get toggleButton() {
    return document.getElementById('toggle-camera');
  },

  get toggleFlashBtn() {
    return document.getElementById('toggle-flash');
  },

  init: function camera_init() {

    // Dont let the phone go to sleep while the camera is
    // active, user must manually close it
    if (navigator.requestWakeLock) {
      navigator.requestWakeLock('screen');
    }

    this._storageState = this.STORAGE_INIT;
    this.setCaptureMode(this.CAMERA);
    this.initPositionUpdate();

    // We lock the screen orientation and deal with rotating
    // the icons manually
    var css = '#switch-button span, #capture-button span, ' +
      '#gallery-button span { -moz-transform: rotate(0deg); }';
    var insertId = this._styleSheet.cssRules.length - 1;
    this._orientationRule = this._styleSheet.insertRule(css, insertId);
    window.addEventListener('deviceorientation', this.orientChange.bind(this));

    this.toggleButton.addEventListener('click', this.toggleCamera.bind(this));
    this.toggleFlashBtn.addEventListener('click', this.toggleFlash.bind(this));
    this.viewfinder.addEventListener('click', this.toggleFilmStrip.bind(this));
    this.filmStrip.addEventListener('click', this.filmStripPressed.bind(this));

    this.switchButton
      .addEventListener('click', this.toggleModePressed.bind(this));
    this.captureButton
      .addEventListener('click', this.capturePressed.bind(this));
    this.galleryButton
      .addEventListener('click', this.galleryBtnPressed.bind(this));

    if (!navigator.mozCameras) {
      this.captureButton.setAttribute('disabled', 'disabled');
      return;
    }

    if (this._secureMode) {
      this.galleryButton.setAttribute('disabled', 'disabled');
    }

    if ('mozSettings' in navigator) {
      var req = navigator.mozSettings.createLock().get(this._shutterKey);
      req.onsuccess = (function onsuccess() {
        this._shutterSoundEnabled = req.result[this._shutterKey];
      }).bind(this);

      navigator.mozSettings.addObserver(this._shutterKey, (function(e) {
        this._shutterSoundEnabled = e.settingValue;
      }).bind(this));
    }

    this._pictureStorage
      .addEventListener('change', this.deviceStorageChangeHandler.bind(this));

    asyncStorage.getItem(this._dcfConfig.key, (function(value) {
      if (value) {
        this._dcfConfig.seq = value;
      }

      this.setToggleCameraStyle();
      this.setSource(this._camera);

      this._started = true;

      if (this._pendingPick) {
        this.initActivity();
      }
    }).bind(this));
  },

  enableButtons: function camera_enableButtons() {
    this.switchButton.removeAttribute('disabled');
    this.captureButton.removeAttribute('disabled');
  },

  disableButtons: function camera_disableButtons() {
    this.switchButton.setAttribute('disabled', 'disabled');
    this.captureButton.setAttribute('disabled', 'disabled');
  },

  // When inside an activity the user cannot switch between
  // the gallery or video recording.
  initActivity: function camera_initActivity() {
    this.galleryButton.setAttribute('disabled', 'disabled');
    this.switchButton.setAttribute('disabled', 'disabled');
  },

  cancelActivity: function camera_cancelActivity(error) {
    if (error && this._pendingPick) {
      this._pendingPick.postError('pick cancelled');
    }
    this._pendingPick = null;

    if (!this._secureMode) {
      this.galleryButton.removeAttribute('disabled');
    }
    this.switchButton.removeAttribute('disabled');
  },

  toggleModePressed: function camera_toggleCaptureMode(e) {
    if (e.target.getAttribute('disabled')) {
      return;
    }

    var newMode = (this.captureMode === this.CAMERA) ? this.VIDEO : this.CAMERA;
    this.disableButtons();
    this.setCaptureMode(newMode);

    function gotPreviewStream(stream) {
      this.viewfinder.mozSrcObject = stream;
      this.viewfinder.play();
      this.enableButtons();
    }
    if (this.captureMode === this.CAMERA) {
      this._cameraObj.getPreviewStream(this._previewConfig,
                                       gotPreviewStream.bind(this));
    } else {
      this._cameraObj.getPreviewStreamVideoMode(this._previewConfigVideo,
                                                gotPreviewStream.bind(this));
    }
  },

  toggleCamera: function camera_toggleCamera() {
    this._camera = 1 - this._camera;
    this.setSource(this._camera);
    this.setToggleCameraStyle();
  },

  setToggleCameraStyle: function camera_setToggleCameraStyle() {
    var modeName = this._camera === 0 ? 'back' : 'front';
    this.toggleButton.setAttribute('data-mode', modeName);
  },

  toggleFlash: function camera_toggleFlash() {
    if (this._currentFlashMode === this._flashModes.length - 1) {
      this._currentFlashMode = 0;
    } else {
      this._currentFlashMode = this._currentFlashMode + 1;
    }
    this.setFlashMode();
  },

  setFlashMode: function camera_setFlashMode() {
    var flashModeName = this._flashModes[this._currentFlashMode];
    this.toggleFlashBtn.setAttribute('data-mode', flashModeName);
    this._cameraObj.flashMode = flashModeName;
  },

  toggleRecording: function camera_toggleRecording() {
    if (this._recording) {
      this.stopRecording();
      return;
    }

    this.startRecording();
  },

  startRecording: function camera_startRecording() {
    var captureButton = this.captureButton;
    var switchButton = this.switchButton;

    var onerror = function() {
      handleError('error-recording');
    }
    var onsuccess = (function onsuccess() {
      document.body.classList.add('capturing');
      captureButton.removeAttribute('disabled');
      this._recording = true;
      this.startRecordingTimer();
      // User closed app while recording was trying to start
      if (document.mozHidden) {
        this.stopRecording();
      }
    }).bind(this);

    var handleError = (function handleError(id) {
      this.enableButtons();
      alert(navigator.mozL10n.get(id + '-title') + '. ' +
            navigator.mozL10n.get(id + '-text'));
    }).bind(this);

    this.disableButtons();

    var startRecording = (function startRecording(freeBytes) {
      if (freeBytes < this.RECORD_SPACE_MIN) {
        handleError('nospace');
        return;
      }

      var config = {
        rotation: 90,
        maxFileSizeBytes: freeBytes - this.RECORD_SPACE_PADDING
      };
      this._cameraObj.startRecording(config,
                                     this._videoStorage, this._videoPath,
                                     onsuccess, onerror);
    }).bind(this);

    this.createDCFFilename('video', '3gp', (function(filename) {
      this._videoPath = filename;
      // The CameraControl API will not automatically create directories
      // for the new file if they do not exist, so write a stub file
      // via the deviceStorage API which will, then start recording
      // over it
      var stub = new Blob([''], {'type': 'video\/3gpp'});
      var req = this._videoStorage.addNamed(stub, filename);
      req.onerror = onerror;
      req.onsuccess = (function fileCreated() {
        // Determine the number of bytes available on disk.
        var stat = this._videoStorage.stat();
        stat.onerror = onerror;
        stat.onsuccess = function() {
          startRecording(stat.result.freeBytes);
        }
      }).bind(this);
    }).bind(this));
  },

  addToFilmStrip: function camera_addToFilmStrip(name, thumbnail, type) {
    this._photosTaken.push({
      name: name,
      blob: thumbnail,
      type: type
    });
    if (this._photosTaken.length > this.THUMBNAIL_LIMIT) {
      this._photosTaken.shift();
    }
    this.showFilmStrip();
  },

  generateVideoThumbnail: function camera_generateVideoThumbnail(callback) {
    var video;
    var preview = this._videoPreview;
    var thumbGenerated = function(blob) {
      callback(blob, video.type);
    }

    this._videoStorage.get(this._videoPath).onsuccess = (function(e) {
      video = e.target.result;
      preview.preload = 'metadata';
      preview.width = self.THUMB_WIDTH + 'px';
      preview.height = self.THUMB_HEIGHT + 'px';
      preview.src = URL.createObjectURL(video);
      this._waitingToGenerateThumb = true;
      // Some video formats fail to load metadata, they are still
      // able to generate a thumbnail though, the callback will
      // prevents itself from running twice
      var genThumb = this.generateThumbnail.bind(this, preview, thumbGenerated);
      setTimeout(genThumb, 2500);
      preview.onloadedmetadata = genThumb;
    }).bind(this);
  },

  generateImageThumbnail: function camera_generateImageThumbnail(input, callback) {
    var img = document.createElement('img');
    this._waitingToGenerateThumb = true;
    img.src = window.URL.createObjectURL(input);
    img.onload = this.generateThumbnail.bind(this, img, callback);
  },

  generateThumbnail: function camera_generateThumbnail(input, callback) {
    if (!this._waitingToGenerateThumb) {
      return;
    }
    this._waitingToGenerateThumb = false;
    var canvas = document.createElement('canvas');
    canvas.width = this.THUMB_WIDTH;
    canvas.height = this.THUMB_HEIGHT;
    URL.revokeObjectURL(input.src);
    try {
      canvas.getContext('2d').drawImage(input, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(callback);
    } catch (e) {
      console.error('Failed to create a poster image:', e);
    }
  },

  startRecordingTimer: function camera_startRecordingTimer() {
    this._videoStart = new Date().getTime();
    this.videoTimer.textContent = this.formatTimer(0);
    this._videoTimer =
      window.setInterval(this.updateVideoTimer.bind(this), 1000);
  },

  updateVideoTimer: function camera_updateVideoTimer() {
    var videoLength =
      Math.round((new Date().getTime() - this._videoStart) / 1000);
    this.videoTimer.textContent = this.formatTimer(videoLength);
  },

  stopRecording: function camera_stopRecording() {
    this._cameraObj.stopRecording();
    this._recording = false;
    window.clearInterval(this._videoTimer);
    this.enableButtons();
    document.body.classList.remove('capturing');
    this.generateVideoThumbnail((function(thumbnail, videotype) {
      if (!thumbnail) {
        return;
      }
      this.addToFilmStrip(this._videoPath, thumbnail, videotype);
    }).bind(this));
  },

  formatTimer: function camera_formatTimer(time) {
    var minutes = Math.floor(time / 60);
    var seconds = Math.round(time % 60);
    if (minutes < 60) {
      return this.padLeft(minutes, 2) + ':' + this.padLeft(seconds, 2);
    }
    return '';
  },

  padLeft: function camera_padLeft(num, length) {
    var r = String(num);
    while (r.length < length) {
      r = '0' + r;
    }
    return r;
  },

  capturePressed: function camera_doCapture(e) {
    if (e.target.getAttribute('disabled')) {
      return;
    }

    if (this.captureMode === this.CAMERA) {
      this.prepareTakePicture();
    } else {
      this.toggleRecording();
    }
  },

  galleryBtnPressed: function camera_galleryBtnPressed() {
    // Launch the gallery with an activity
    var a = new MozActivity({
      name: 'browse',
      data: {
        type: 'photos'
      }
    });
  },

  orientChange: function camera_orientChange(e) {
    // Orientation is 0 starting at 'natural portrait' increasing
    // going clockwise
    var orientation = (e.beta > 45) ? 180 :
      (e.beta < -45) ? 0 :
      (e.gamma < -45) ? 90 :
      (e.gamma > 45) ? 270 : 0;

    if (orientation !== this._phoneOrientation) {
      var rule = this._styleSheet.cssRules[this._orientationRule];
      // PLEASE DO SOMETHING KITTENS ARE DYING
      // Setting MozRotate to 90 or 270 causes element to disappear
      rule.style.MozTransform = 'rotate(' + -(orientation + 1) + 'deg)';
      this._phoneOrientation = orientation;
    }
  },

  setCaptureMode: function camera_setCaptureMode(mode) {
    if (this.captureMode) {
      document.body.classList.remove(this.captureMode);
    }
    this.captureMode = mode;
    document.body.classList.add(mode);
  },

  toggleFilmStrip: function camera_toggleFilmStrip(ev) {
    if (this._filmStripShown) {
      this.hideFilmStrip();
    } else {
      this.showFilmStrip();
    }
  },

  filmStripPressed: function camera_filmStripPressed(e) {
    var camera = this;
    var target = e.target;
    if (target.nodeName === 'IMG') {
      target = target.parentNode;
    }

    var filename = target.getAttribute('data-filename');
    var filetype = target.getAttribute('data-filetype');

    if (this._secureMode || !filename) {
      return;
    }

    var isVideo = /video/.test(filetype);

    // Launch the gallery with an open activity to view this specific photo
    var storage =  isVideo ? this._videoStorage : this._pictureStorage;
    var getreq = storage.get(filename);

    getreq.onerror = function() {
      console.warn('failed to get file:', filename, getreq.error.name);
    };

    getreq.onsuccess = function() {
      // This wont currently work for videos due to a bug with cross activity
      // blobs - https://bugzilla.mozilla.org/show_bug.cgi?id=812098
      var file = getreq.result;
      var activity;
      if (!isVideo) {
        activity = new MozActivity({
          name: 'open',
          data: {
            type: filetype,
            blob: file,
            show_delete_button: true
          }
        });
      } else {
        activity = new MozActivity({
          name: 'open',
          data: {
            type: filetype,
            src: 'ds:videos://' + filename,
            extras: {
              title: filename.split('/').pop()
            }
          }
        });
      }

      // We don't seem to get a mozvisiblitychange event when the
      // inline open activity opens up, so we explicitly stop the
      // and restart the preview stream
      camera.stopPreview();

      activity.onerror = function(e) {
        console.warn('open activity error:', activity.error.name);
        camera.startPreview();
      };
      activity.onsuccess = function(e) {
        camera.startPreview();
        if (activity.result.delete) {
          storage.delete(filename).onerror = function(e) {
            console.warn('Failed to delete', filename,
                         'from DeviceStorage:', e.target.error);
          };
        }
      };
    };
  },

  setSource: function camera_setSource(camera) {

    this.viewfinder.mozSrcObject = null;
    this._timeoutId = 0;

    var viewfinder = this.viewfinder;
    var style = viewfinder.style;
    var width = document.body.clientHeight;
    var height = document.body.clientWidth;

    style.top = ((width / 2) - (height / 2)) + 'px';
    style.left = -((width / 2) - (height / 2)) + 'px';

    var transform = 'rotate(90deg)';
    var rotation;
    if (camera == 1) {
      /* backwards-facing camera */
      transform += ' scale(-1, 1)';
      rotation = 0;
    } else {
      /* forwards-facing camera */
      rotation = 0;
    }

    style.MozTransform = transform;
    style.width = width + 'px';
    style.height = height + 'px';

    this._cameras = navigator.mozCameras.getListOfCameras();
    var options = {camera: this._cameras[this._camera]};

    function gotPreviewScreen(stream) {
      this.enableButtons();
      this._previewActive = true;
      viewfinder.mozSrcObject = stream;
      viewfinder.play();
      this.checkStorageSpace();
    }

    function gotCamera(camera) {
      this._cameraObj = camera;
      this._config.rotation = rotation;
      this._autoFocusSupported =
        camera.capabilities.focusModes.indexOf('auto') !== -1;
      this._pictureSize =
        this.pickPictureSize(camera.capabilities.pictureSizes);
      this.enableCameraFeatures(camera.capabilities);
      camera.onShutter = (function() {
        if (this._shutterSoundEnabled) {
          this._shutterSound.play();
        }
      }).bind(this);
      camera.onRecorderStateChange = this.recordingStateChanged.bind(this);
      camera.getPreviewStream(this._previewConfig, gotPreviewScreen.bind(this));
    }
    navigator.mozCameras.getCamera(options, gotCamera.bind(this));
  },

  recordingStateChanged: function(msg) {
    if (msg === 'FileSizeLimitReached') {
      this.stopRecording();
      alert(navigator.mozL10n.get('size-limit-reached'));
    }
  },

  enableCameraFeatures: function camera_enableCameraFeatures(capabilities) {
    if (this._cameras.length > 1) {
      this.toggleButton.classList.remove('hidden');
    } else {
      this.toggleButton.classList.add('hidden');
    }

    this._flashModes = capabilities.flashModes;
    if (this._flashModes) {
      this.setFlashMode();
      this.toggleFlashBtn.classList.remove('hidden');
    } else {
      this.toggleFlashBtn.classList.add('hidden');
    }
  },

  startPreview: function camera_startPreview() {
    this.viewfinder.play();
    this.setSource(this._camera);
    this._previewActive = true;
    this.initPositionUpdate();
  },

  stopPreview: function camera_stopPreview() {
    if (this._recording) {
      this.stopRecording();
    }
    this.disableButtons();
    this.viewfinder.pause();
    this._previewActive = false;
    this.viewfinder.mozSrcObject = null;
    this.cancelPositionUpdate();
  },

  resumePreview: function camera_resumePreview() {
    this._cameraObj.resumePreview();
    this._previewActive = true;
    this.enableButtons();
  },

  showFilmStrip: function camera_showFilmStrip() {
    if (!this._photosTaken.length) {
      return;
    }

    this.filmStrip.innerHTML = '';

    this._photosTaken.forEach(function foreach_photos(image) {
      var wrapper = document.createElement('div');
      var preview = document.createElement('img');
      wrapper.style.visibility = 'hidden';
      wrapper.classList.add('thumbnail');
      wrapper.classList.add(/image/.test(image.type) ? 'image' : 'video');
      wrapper.setAttribute('data-filetype', image.type);
      wrapper.setAttribute('data-filename', image.name);
      preview.src = window.URL.createObjectURL(image.blob);
      preview.onload = function() {
        wrapper.style.visibility = 'visible';
        window.URL.revokeObjectURL(this.src);
      };
      wrapper.appendChild(preview);
      this.filmStrip.appendChild(wrapper);
    }, this);
    this.filmStrip.classList.remove('hidden');
    this._filmStripShown = true;
  },

  hideFilmStrip: function camera_hideFilmStrip() {
    this.filmStrip.classList.add('hidden');
    this._filmStripShown = false;
    if (this._filmStripTimer) {
      window.clearTimeout(this.filmStripTimer);
    }
  },

  restartPreview: function camera_restartPreview() {
    this._filmStripTimer =
      window.setTimeout(this.hideFilmStrip.bind(this), 5000);
    this._resumeViewfinderTimer =
      window.setTimeout(this.resumePreview.bind(this), this.PREVIEW_PAUSE);
  },

  createDCFFilename: function camera_createDCFFilename(type, ext, callback) {
    var self = this;
    var dcf = this._dcfConfig;
    var filename = dcf[type].prefix + this.padLeft(dcf.seq.file, 4) + '.' + ext;
    var path = 'DCIM/' + dcf.seq.dir + dcf.postFix + '/' + filename;
    var storage = type === 'video' ? this._videoStorage : this._pictureStorage;

    // A file with this name may have been written by the user or
    // our indexeddb sequence tracker was cleared, check we wont overwrite
    // anything
    var req = storage.get(path);

    // A file existed, we bump the directory then try to generate a
    // new filename
    req.onsuccess = function() {
      dcf.seq.file = 1;
      dcf.seq.dir += 1;
      asyncStorage.setItem(dcf.key, dcf.seq, function() {
        self.createDCFFilename(type, ext, callback);
      });
    };

    // No file existed, we are good to go
    req.onerror = function() {
      if (dcf.seq.file < 9999) {
        dcf.seq.file += 1;
      } else {
        dcf.seq.file = 1;
        dcf.seq.dir += 1;
      }
      asyncStorage.setItem(dcf.key, dcf.seq, function() {
        callback(path);
      });
    };
  },

  takePictureSuccess: function camera_takePictureSuccess(blob) {
    this._manuallyFocused = false;
    this.hideFocusRing();
    this.restartPreview();
    this.createDCFFilename('image', 'jpg', (function(name) {
      var addreq = this._pictureStorage.addNamed(blob, name);
      addreq.onsuccess = (function() {
        if (this._pendingPick) {
          // XXX: https://bugzilla.mozilla.org/show_bug.cgi?id=806503
          // We ought to just be able to pass this blob to the activity.
          // But there seems to be a bug with blob lifetimes and activities.
          // So we'll get a new blob back out of device storage to ensure
          // that we've got a file-backed blob instead of a memory-backed blob.
          var getreq = this._pictureStorage.get(name);
          getreq.onsuccess = (function() {
            this._pendingPick.postResult({
              type: 'image/jpeg',
              blob: getreq.result
            });
            this.cancelActivity();
          }).bind(this);

          return;
        }

        this.generateImageThumbnail(blob, (function(thumbBlob) {
          this.addToFilmStrip(name, thumbBlob, 'image/jpeg');
          this.checkStorageSpace();
        }).bind(this));

      }).bind(this);

      addreq.onerror = function() {
        alert(navigator.mozL10n.get('error-saving-title') + '. ' +
              navigator.mozL10n.get('error-saving-text'));
      };
    }).bind(this));
  },

  hideFocusRing: function camera_hideFocusRing() {
    this.focusRing.removeAttribute('data-state');
  },

  checkStorageSpace: function camera_checkStorageSpace() {
    if (this.updateOverlay()) {
      return;
    }
    var MAX_IMAGE_SIZE = this._pictureSize.width * this._pictureSize.height *
      4 + 4096;
    this._pictureStorage.stat().onsuccess = (function(e) {
      var stats = e.target.result;

      // If we have not yet checked the state of the storage, do so
      if (this._storageState === this.STORAGE_INIT) {
        this.updateStorageState(stats.state);
        this.updateOverlay();
      }

      if (this._storageState !== this.STORAGE_AVAILABLE) {
        return;
      }
      if (stats.freeBytes < MAX_IMAGE_SIZE) {
        this._storageState = this.STORAGE_CAPACITY;
      }
      this.updateOverlay();

    }).bind(this);
  },

  deviceStorageChangeHandler: function camera_deviceStorageChangeHandler(e) {
    switch (e.reason) {
    case 'available':
    case 'unavailable':
    case 'shared':
      this.updateStorageState(e.reason);
      break;
    case 'deleted':
      this.removeFromFilmStrip(e.path);
    }
    this.checkStorageSpace();
  },

  updateStorageState: function camera_updateStorageState(state) {
    switch (state) {
    case 'available':
      this._storageState = this.STORAGE_AVAILABLE;
      break;
    case 'unavailable':
      this._storageState = this.STORAGE_NOCARD;
      break;
    case 'shared':
      this._storageState = this.STORAGE_UNMOUNTED;
      break;
    }
  },

  removeFromFilmStrip: function camera_removeFromFilmStrip(filename) {
    this._photosTaken = this._photosTaken.filter(function(image) {
      return image.name !== filename;
    });
    if (this._filmStripShown) {
      this.showFilmStrip();
    }
  },

  updateOverlay: function camera_updateOverlay() {
    if (this._storageState === this.STORAGE_INIT) {
      return false;
    }

    if (this._storageState === this.STORAGE_AVAILABLE) {
      // Preview may have previously been paused if storage
      // was not available
      if (!this._previewActive && !document.mozHidden) {
        this.startPreview();
      }
      this.showOverlay(null);
      return false;
    }

    switch (this._storageState) {
    case this.STORAGE_NOCARD:
      this.showOverlay('nocard');
      break;
    case this.STORAGE_UNMOUNTED:
      this.showOverlay('pluggedin');
      break;
    case this.STORAGE_CAPACITY:
      this.showOverlay('nospace2');
      break;
    }
    if (this._previewActive) {
      this.stopPreview();
    }
    return true;
  },

  prepareTakePicture: function camera_takePicture() {
    this.disableButtons();
    this.focusRing.setAttribute('data-state', 'focusing');
    if (this._autoFocusSupported && !this._manuallyFocused) {
      this._cameraObj.autoFocus(this.autoFocusDone.bind(this));
    } else {
      this.takePicture();
    }
  },

  autoFocusDone: function camera_autoFocusDone(success) {
    if (!success) {
      this.enableButtons();
      this.focusRing.setAttribute('data-state', 'fail');
      window.setTimeout(this.hideFocusRing.bind(this), 1000);
      return;
    }
    this.focusRing.setAttribute('data-state', 'focused');
    this.takePicture();
  },

  takePicture: function camera_takePicture() {
    this._config.rotation = this._phoneOrientation;
    this._config.pictureSize = this._pictureSize;
    if (this._position) {
      this._config.position = this._position;
    }
    this._cameraObj
      .takePicture(this._config, this.takePictureSuccess.bind(this));
  },

  showOverlay: function camera_showOverlay(id) {
    this._currentOverlay = id;

    if (id === null) {
      this.overlay.classList.add('hidden');
      return;
    }

    this.overlayTitle.textContent = navigator.mozL10n.get(id + '-title');
    this.overlayText.textContent = navigator.mozL10n.get(id + '-text');
    this.overlay.classList.remove('hidden');
  },

  pickPictureSize: function camera_pickPictureSize(pictureSizes) {
    var maxRes = this.MAX_IMAGE_RES;
    var size = pictureSizes.reduce(function(acc, size) {
      var mp = size.width * size.height;
      return (mp > acc.width * acc.height && mp <= maxRes) ? size : acc;
    }, {width: 0, height: 0});

    if (size.width === 0 && size.height === 0) {
      return pictureSizes[0];
    } else {
      return size;
    }
  },

  initPositionUpdate: function camera_initPositionUpdate() {
    if (this._positionTimer) {
      return;
    }
    this._positionTimer = setInterval(this.updatePosition.bind(this),
                                      this.POSITION_TIMEOUT);
    this.updatePosition();
  },

  updatePosition: function camera_updatePosition() {
    var self = this;
    navigator.geolocation.getCurrentPosition(function(position) {
      self._position = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
    }, function() {
      console.warn('Camera: Could not fetch location');
    });
  },

  cancelPositionUpdate: function camera_cancelPositionUpdate() {
    window.clearInterval(this._positionTimer);
    this._positionTimer = null;
  }
};

function actHandle(activity) {
  var name = activity.source.name;
  if (name === 'pick') {
    Camera._pendingPick = activity;
    if (Camera._started) {
      Camera.initActivity();
    }
  }
}

if (window.navigator.mozSetMessageHandler) {
  window.navigator.mozSetMessageHandler('activity', actHandle);
}

window.addEventListener('DOMContentLoaded', function CameraInit() {
  Camera.init();
});

document.addEventListener('mozvisibilitychange', function() {
  if (document.mozHidden) {
    Camera.stopPreview();
    Camera.cancelActivity(true);
  } else {
    Camera.startPreview();
  }
});

window.addEventListener('beforeunload', function() {
  window.clearTimeout(Camera._timeoutId);
  delete Camera._timeoutId;
  Camera.viewfinder.mozSrcObject = null;
});
