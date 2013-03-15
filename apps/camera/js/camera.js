'use strict';

var loader = LazyLoader;

// Utility functions
function padLeft(num, length) {
  var r = String(num);
  while (r.length < length) {
    r = '0' + r;
  }
  return r;
}


// This handles the logic pertaining to the naming of files according
// to the Design rule for Camera File System
// * http://en.wikipedia.org/wiki/Design_rule_for_Camera_File_system
var DCFApi = (function() {

  var api = {};

  var dcfConfigLoaded = false;
  var deferredArgs = null;
  var defaultSeq = {file: 1, dir: 100};

  var dcfConfig = {
    key: 'dcf_key',
    seq: null,
    postFix: 'MZLLA',
    prefix: {video: 'VID_', image: 'IMG_'},
    ext: {video: '3gp', image: 'jpg'}
  };

  api.init = function() {

    asyncStorage.getItem(dcfConfig.key, function(value) {

      dcfConfigLoaded = true;
      dcfConfig.seq = value ? value : defaultSeq;

      // We have a previous call to createDCFFilename that is waiting for
      // a response, fire it again
      if (deferredArgs) {
        var args = deferredArgs;
        api.createDCFFilename(args.storage, args.type, args.callback);
        deferredArgs = null;
      }
    });
  };

  api.createDCFFilename = function(storage, type, callback) {

    // We havent loaded the current counters from indexedDB yet, defer
    // the call
    if (!dcfConfigLoaded) {
      deferredArgs = {storage: storage, type: type, callback: callback};
      return;
    }

    var filepath = 'DCIM/' + dcfConfig.seq.dir + dcfConfig.postFix + '/';
    var filename = dcfConfig.prefix[type] +
      padLeft(dcfConfig.seq.file, 4) + '.' +
      dcfConfig.ext[type];

    // A file with this name may have been written by the user or
    // our indexeddb sequence tracker was cleared, check we wont overwrite
    // anything
    var req = storage.get(filepath + filename);

    // A file existed, we bump the directory then try to generate a
    // new filename
    req.onsuccess = function() {
      dcfConfig.seq.file = 1;
      dcfConfig.seq.dir += 1;
      asyncStorage.setItem(dcfConfig.key, dcfConfig.seq, function() {
        api.createDCFFilename(storage, type, callback);
      });
    };

    // No file existed, we are good to go
    req.onerror = function() {
      if (dcfConfig.seq.file < 9999) {
        dcfConfig.seq.file += 1;
      } else {
        dcfConfig.seq.file = 1;
        dcfConfig.seq.dir += 1;
      }
      asyncStorage.setItem(dcfConfig.key, dcfConfig.seq, function() {
        callback(filepath, filename);
      });
    };
  };

  return api;

})();

var Camera = {
  _cameras: null,
  _camera: 0,
  _captureMode: null,
  _recording: false,

  // In secure mode the user cannot browse to the gallery
  _secureMode: window.parent !== window,
  _currentOverlay: null,

  CAMERA: 'camera',
  VIDEO: 'video',

  _videoTimer: null,
  _videoStart: null,
  _videoPath: null,

  _autoFocusSupported: 0,
  _manuallyFocused: false,

  _timeoutId: 0,
  _cameraObj: null,

  _photosTaken: [],
  _cameraProfile: null,

  _resumeViewfinderTimer: null,
  _waitingToGenerateThumb: false,

  _styleSheet: document.styleSheets[0],
  _orientationRule: null,
  _phoneOrientation: 0,

  _pictureStorage: null,
  _videoStorage: null,
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
  FILMSTRIP_DURATION: 5000, // show filmstrip for 5s before fading

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
    rotation: 0,
    width: 352,
    height: 288
  },

  _shutterKey: 'camera.shutter.enabled',
  _shutterSound: null,
  _shutterSoundEnabled: true,

  PROMPT_DELAY: 2000,

  _watchId: null,
  _position: null,

  _pendingPick: null,

  // The minimum available disk space to start recording a video.
  RECORD_SPACE_MIN: 1024 * 1024 * 2,

  // Number of bytes left on disk to let us stop recording.
  RECORD_SPACE_PADDING: 1024 * 1024 * 1,

  // Maximum image resolution for still photos taken with camera
  MAX_IMAGE_RES: 1600 * 1200, // Just under 2 megapixels

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

  get toggleButton() {
    return document.getElementById('toggle-camera');
  },

  get toggleFlashBtn() {
    return document.getElementById('toggle-flash');
  },

  // We have seperated init and delayedInit as we want to make sure
  // that on first launch we dont interfere and load the camera
  // previewStream as fast as possible, once the previewStream is
  // active we do the rest of the initialisation.
  init: function() {
    var self = this;
    this.setCaptureMode(this.CAMERA);
    this.loadCameraPreview(this._camera, function() {
      var files = [
        'style/filmstrip.css',
        'style/VideoPlayer.css',
        '/shared/js/async_storage.js',
        '/shared/js/blobview.js',
        '/shared/js/media/jpeg_metadata_parser.js',
        '/shared/js/media/get_video_rotation.js',
        '/shared/js/media/video_player.js',
        '/shared/js/media/media_frame.js',
        '/shared/js/gesture_detector.js',
        'js/filmstrip.js'
      ];
      loader.load(files, function() {
        self.delayedInit();
      });
    });
  },

  delayedInit: function camera_delayedInit() {
    // If we don't have any pending messages, show the usual UI
    // Otherwise, determine which buttons to show once we get our
    // activity message
    if (!navigator.mozHasPendingMessage('activity')) {
      this.galleryButton.classList.remove('hidden');
      this.switchButton.classList.remove('hidden');
      this.enableButtons();
    }

    // Dont let the phone go to sleep while the camera is
    // active, user must manually close it
    if (navigator.requestWakeLock) {
      navigator.requestWakeLock('screen');
    }

    this.setToggleCameraStyle();

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

    this._shutterSound = new Audio('./resources/sounds/shutter.ogg');
    this._shutterSound.mozAudioChannelType = 'notification';

    if ('mozSettings' in navigator) {
      var req = navigator.mozSettings.createLock().get(this._shutterKey);
      req.onsuccess = (function onsuccess() {
        this._shutterSoundEnabled = req.result[this._shutterKey];
      }).bind(this);

      navigator.mozSettings.addObserver(this._shutterKey, (function(e) {
        this._shutterSoundEnabled = e.settingValue;
      }).bind(this));
    }

    this._storageState = this.STORAGE_INIT;

    this._pictureStorage = navigator.getDeviceStorage('pictures');
    this._videoStorage = navigator.getDeviceStorage('videos'),

    this._pictureStorage
      .addEventListener('change', this.deviceStorageChangeHandler.bind(this));
    this.checkStorageSpace();

    navigator.mozSetMessageHandler('activity', function(activity) {
      var name = activity.source.name;
      if (name === 'pick') {
        Camera.initPick(activity);
      }
      else {
        // We got another activity. Perhaps we were launched from gallery
        // So show our usual buttons
        Camera.galleryButton.classList.remove('hidden');
        Camera.switchButton.classList.remove('hidden');
      }
      Camera.enableButtons();
    });

    this.previewEnabled();
    DCFApi.init();
  },

  enableButtons: function camera_enableButtons() {
    if (!this._pendingPick) {
      this.switchButton.removeAttribute('disabled');
    }
    this.captureButton.removeAttribute('disabled');
  },

  disableButtons: function camera_disableButtons() {
    this.switchButton.setAttribute('disabled', 'disabled');
    this.captureButton.setAttribute('disabled', 'disabled');
  },

  // When inside an activity the user cannot switch between
  // the gallery or video recording.
  initPick: function camera_initPick(activity) {
    this._pendingPick = activity;

    // Hide the gallery and switch buttons, leaving only the shutter
    this.galleryButton.classList.add('hidden');
    this.switchButton.classList.add('hidden');

    // Display the cancel button and add an event listener for it
    var cancelButton = document.getElementById('cancel-pick');
    cancelButton.classList.remove('hidden');
    cancelButton.onclick = this.cancelPick.bind(this);
  },

  cancelPick: function camera_cancelPick() {
    if (this._pendingPick) {
      this._pendingPick.postError('pick cancelled');
    }
    this._pendingPick = null;
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
      this._previewConfigVideo.rotation = this._phoneOrientation;
      this._cameraObj.getPreviewStreamVideoMode(this._previewConfigVideo,
                                                gotPreviewStream.bind(this));
    }
  },

  toggleCamera: function camera_toggleCamera() {
    this._camera = 1 - this._camera;
    this.loadCameraPreview(this._camera, this.enableButtons.bind(this));
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
    };
    var onsuccess = (function onsuccess() {
      document.body.classList.add('capturing');
      captureButton.removeAttribute('disabled');
      this._recording = true;
      this.startRecordingTimer();

      // Hide the filmstrip to prevent the users from
      // entering the preview mode after Camera starts recording
      if (Filmstrip.isShown())
        Filmstrip.hide();

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
        rotation: this._phoneOrientation,
        maxFileSizeBytes: freeBytes - this.RECORD_SPACE_PADDING
      };
      this._cameraObj.startRecording(config,
                                     this._videoStorage, this._videoPath,
                                     onsuccess, onerror);
    }).bind(this);

    DCFApi.createDCFFilename(this._videoStorage,
                             'video',
                             (function(path, name) {
      this._videoPath = path + name;

      // The CameraControl API will not automatically create directories
      // for the new file if they do not exist, so write a dummy file
      // to the same directory via DeviceStorage to ensure that the directory
      // exists before recording starts.
      var dummyblob = new Blob([''], {type: 'video/3gpp'});
      var dummyfilename = path + '.' + name;
      var req = this._videoStorage.addNamed(dummyblob, dummyfilename);
      req.onerror = onerror;
      req.onsuccess = (function fileCreated() {
        this._videoStorage.delete(dummyfilename); // No need to wait for success
        // Determine the number of bytes available on disk.
        var spaceReq = this._videoStorage.freeSpace();
        spaceReq.onerror = onerror;
        spaceReq.onsuccess = function() {
          startRecording(spaceReq.result);
        };
      }).bind(this);
    }).bind(this));
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

    // XXX
    // I need some way to know when the camera is done writing this file
    // currently I'm sending this to the filmstrip which is trying to
    // determine its rotation and fails sometimes if the file is not
    // yet complete.  For now, I just defer for a second, but
    // there ought to be a better way.
    // See https://bugzilla.mozilla.org/show_bug.cgi?id=817367
    // Maybe I'll get a device storage callback... check this.
    var videofile = this._videoPath;
    setTimeout(function() {
      Filmstrip.addVideo(videofile);
      Filmstrip.show(Camera.FILMSTRIP_DURATION);
    }, 1000);
  },

  formatTimer: function camera_formatTimer(time) {
    var minutes = Math.floor(time / 60);
    var seconds = Math.round(time % 60);
    if (minutes < 60) {
      return padLeft(minutes, 2) + ':' + padLeft(seconds, 2);
    }
    return '';
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
    // Can't launch the gallery if the lockscreen is locked.
    // The button shouldn't even be visible in this case, but
    // let's be really sure here.
    if (this._secureMode)
      return;

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

      Filmstrip.setOrientation(orientation);
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
    // We will just ignore
    // because the filmstrip shouldn't be shown
    // while Camera is recording
    if (this._recording)
      return;

    if (Filmstrip.isShown())
      Filmstrip.hide();
    else
      Filmstrip.show();
  },

  loadCameraPreview: function camera_loadCameraPreview(camera, callback) {

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
      viewfinder.mozSrcObject = stream;
      viewfinder.play();

      if (callback) {
        callback();
      }

      this._previewActive = true;
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
      if (this.captureMode === this.CAMERA) {
        camera.getPreviewStream(this._previewConfig,
                                gotPreviewScreen.bind(this));
      } else {
        this._previewConfigVideo.rotation = this._phoneOrientation;
        this._cameraObj.getPreviewStreamVideoMode(this._previewConfigVideo,
                                                  gotPreviewScreen.bind(this));
      }
    }

    // If there is already a camera, we would have to release it first.
    if (this._cameraObj) {
      this.release(function camera_release_callback() {
        navigator.mozCameras.getCamera(options, gotCamera.bind(this));
      });
    } else {
      navigator.mozCameras.getCamera(options, gotCamera.bind(this));
    }
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
    this.loadCameraPreview(this._camera, this.previewEnabled.bind(this));
    this._previewActive = true;
  },

  previewEnabled: function() {
    this.enableButtons();
    setTimeout(this.initPositionUpdate.bind(this), this.PROMPT_DELAY);
  },

  stopPreview: function camera_stopPreview() {
    if (this._recording) {
      this.stopRecording();
    }
    this.disableButtons();
    this.viewfinder.pause();
    this._previewActive = false;
    this.viewfinder.mozSrcObject = null;
    this.release();
  },

  resumePreview: function camera_resumePreview() {
    this._cameraObj.resumePreview();
    this._previewActive = true;
    this.enableButtons();
  },

  restartPreview: function camera_restartPreview() {
    this._resumeViewfinderTimer =
      window.setTimeout(this.resumePreview.bind(this), this.PREVIEW_PAUSE);
  },

  takePictureError: function camera_takePictureError() {
    alert(navigator.mozL10n.get('error-saving-title') + '. ' +
          navigator.mozL10n.get('error-saving-text'));
  },

  takePictureSuccess: function camera_takePictureSuccess(blob) {
    this._config.position = null;
    this._manuallyFocused = false;
    this.hideFocusRing();
    this.restartPreview();
    DCFApi.createDCFFilename(this._pictureStorage,
                             'image',
                             (function(path, name) {
      var addreq = this._pictureStorage.addNamed(blob, path + name);
      addreq.onsuccess = (function() {
        if (this._pendingPick) {
          this._resizeBlobIfNeeded(blob, function(resized_blob) {
            this._pendingPick.postResult({
              type: 'image/jpeg',
              blob: resized_blob,
              name: path + name
            });
            this._pendingPick = null;
          }.bind(this));
          return;
        }

        Filmstrip.addImage(path + name, blob);
        Filmstrip.show(Camera.FILMSTRIP_DURATION);
        this.checkStorageSpace();

      }).bind(this);
      addreq.onerror = this.takePictureError;
    }).bind(this));
  },

  _resizeBlobIfNeeded: function camera_resizeBlobIfNeeded(blob, callback) {
    var pickWidth = this._pendingPick.source.data.width;
    var pickHeight = this._pendingPick.source.data.height;
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
  },

  hideFocusRing: function camera_hideFocusRing() {
    this.focusRing.removeAttribute('data-state');
  },

  checkStorageSpace: function camera_checkStorageSpace() {
    if (this.updateOverlay()) {
      return;
    }

    // The first time we're called, we need to make sure that there
    // is an sdcard and that it is mounted. (Subsequently the device
    // storage change handler will track that.)
    if (this._storageState === this.STORAGE_INIT) {
      this._pictureStorage.available().onsuccess = (function(e) {
        this.updateStorageState(e.target.result);
        this.updateOverlay();
        // Now call the parent method again, so that if the sdcard is
        // available we will actually verify that there is enough space on it
        this.checkStorageSpace();
      }.bind(this));
      return;
    }

    // Now verify that there is enough space to store a picture
    // 4 bytes per pixel plus some room for a header should be more
    // than enough for a JPEG image.
    var MAX_IMAGE_SIZE =
      (this._pictureSize.width * this._pictureSize.height * 4) + 4096;

    this._pictureStorage.freeSpace().onsuccess = (function(e) {
      // XXX
      // If we ever enter this out-of-space condition, it looks like
      // this code will never be able to exit. The user will have to
      // quit the app and start it again. Just deleting files will
      // not be enough to get back to the STORAGE_AVAILABLE state.
      // To fix this, we need an else clause here, and also a change
      // in the updateOverlay() method.
      if (e.target.result < MAX_IMAGE_SIZE) {
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
    this._config.dateTime = Date.now() / 1000;
    // We do not attach our current position to the exif of photos
    // that are taken via an activity as that leaks position information
    // to other apps without permission
    if (this._position && !this._pendingPick) {
      this._config.position = this._position;
    }
    this._cameraObj
      .takePicture(this._config, this.takePictureSuccess.bind(this),
                   this.takePictureError);
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
    if (this._watchId || document.mozHidden) {
      return;
    }
    this._watchId = navigator.geolocation
      .watchPosition(this.updatePosition.bind(this));
  },

  updatePosition: function camera_updatePosition(position) {
    this._position = {
      timestamp: position.timestamp,
      altitude: position.coords.altitude,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude
    };
  },

  cancelPositionUpdate: function camera_cancelPositionUpdate() {
    navigator.geolocation.clearWatch(this._watchId);
    this._watchId = null;
  },

  release: function camera_release(callback) {
    if (!this._cameraObj)
      return;

    this._cameraObj.release(function cameraReleased() {
      Camera._cameraObj = null;
      if (callback)
        callback.call(Camera);
    }, function releaseError() {
      console.warn('Camera: failed to release hardware?');
      if (callback)
        callback.call(Camera);
    });
  }
};

Camera.init();

document.addEventListener('mozvisibilitychange', function() {
  if (document.mozHidden) {
    Camera.stopPreview();
    Camera.cancelPick();
    Camera.cancelPositionUpdate();
    if (this._secureMode) // If the lockscreen is locked
      Filmstrip.clear();  // then forget everything when closing camera
  } else {
    Camera.startPreview();
  }
});

window.addEventListener('beforeunload', function() {
  window.clearTimeout(Camera._timeoutId);
  delete Camera._timeoutId;
  Camera.viewfinder.mozSrcObject = null;
});
