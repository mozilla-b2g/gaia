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

var screenLock = null;
var returnToCamera = true;
var Camera = {
  _initialised: false,
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
  _videoPath: null, // file path relative to video root directory
  _videoRootDir: null, // video root directory string

  _autoFocusSupported: 0,
  _manuallyFocused: false,

  _timeoutId: 0,
  _cameraObj: null,

  _photosTaken: [],
  _cameraProfile: null,

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
  _previewConfig: null,
  _previewPaused: false,
  _previewActive: false,

  // We can recieve multiple FileSizeLimitReached events
  // when recording, since we stop recording on this event
  // only show one alert per recording
  _sizeLimitAlertActive: false,

  FILMSTRIP_DURATION: 5000, // show filmstrip for 5s before fading

  _flashState: {
    camera: {
      supported: false,
      modes: ['off', 'auto', 'on'],
      currentMode: 1 // default flash mode is 'auto'
    },
    video: {
      supported: false,
      modes: ['off', 'torch'],
      currentMode: 0
    }
  },

  _config: {
    fileFormat: 'jpeg'
  },

  _videoProfile: {},

  _shutterKey: 'camera.shutter.enabled',
  _shutterSound: null,
  _shutterSoundEnabled: true,

  PROMPT_DELAY: 2000,

  _watchId: null,
  _position: null,

  _pendingPick: null,
  _savedMedia: null,

  // The minimum available disk space to start recording a video.
  RECORD_SPACE_MIN: 1024 * 1024 * 2,

  // Number of bytes left on disk to let us stop recording.
  RECORD_SPACE_PADDING: 1024 * 1024 * 1,

  // Maximum image resolution for still photos taken with camera
  MAX_IMAGE_RES: 1600 * 1200, // Just under 2 megapixels
  // An estimated JPEG file size is caluclated from 90% quality 24bit/pixel
  ESTIMATED_JPEG_FILE_SIZE: 300 * 1024,

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

  get cancelPickButton() {
    return document.getElementById('cancel-pick');
  },

  get retakeButton() {
    return document.getElementById('retake-button');
  },

  get selectButton() {
    return document.getElementById('select-button');
  },

  get overlayCloseButton() {
    return document.getElementById('overlay-close-button');
  },

  get overlayMenuGroup() {
    return document.getElementById('overlay-menu-group');
  },

  // We have seperated init and delayedInit as we want to make sure
  // that on first launch we dont interfere and load the camera
  // previewStream as fast as possible, once the previewStream is
  // active we do the rest of the initialisation.
  init: function() {
    PerformanceTestingHelper.dispatch('initialising-camera-preview');
    // We dont want to initialise until we know what type of activity
    // we are handling
    var hasMessage = navigator.mozHasPendingMessage('activity');
    navigator.mozSetMessageHandler('activity', this.handleActivity.bind(this));

    if (hasMessage) {
      return;
    }

    // The activity may have defined a captureMode, otherwise
    // be default we use the camera
    if (this._captureMode === null) {
      this.setCaptureMode(this.CAMERA);
    }

    this.loadCameraPreview(this._camera, function() {
      PerformanceTestingHelper.dispatch('camera-preview-loaded');
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
        '/shared/js/lazy_l10n.js',
        'js/filmstrip.js'
      ];
      loader.load(files, function() {
        LazyL10n.get(function localized() {
          Camera.delayedInit();
        });
      });
    });
  },

  delayedInit: function camera_delayedInit() {
    if (!this._pendingPick) {
      this.galleryButton.classList.remove('hidden');
      this.switchButton.classList.remove('hidden');
    }
    this.enableButtons();

    // Dont let the phone go to sleep while the camera is
    // active, user must manually close it
    this.screenWakeLock();
    this.setToggleCameraStyle();

    // We lock the screen orientation and deal with rotating
    // the icons manually
    var css = '#switch-button span, #capture-button span, #toggle-flash, ' +
      '#toggle-camera, #gallery-button span { -moz-transform: rotate(0deg); }';
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
    this.cancelPickButton
      .addEventListener('click', this.cancelPick.bind(this));
    this.retakeButton
      .addEventListener('click', this.retakePressed.bind(this));
    this.selectButton
      .addEventListener('click', this.selectPressed.bind(this));
    this.overlayCloseButton
      .addEventListener('click', this.cancelPick.bind(this));

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
    this.previewEnabled();

    this._initialised = true;
    DCFApi.init();
    PerformanceTestingHelper.dispatch('startup-path-done');
  },

  handleActivity: function camera_handleActivity(activity) {
    // default to allow both photos and videos
    var types = activity.source.data.type || ['image/*', 'video/*'];
    var mode = this.CAMERA;

    if (activity.source.name === 'pick') {
      // When inside an activity the user cannot switch between
      // the gallery or video recording.
      this._pendingPick = activity;

      // Hide the gallery and switch buttons, leaving only the shutter
      this.galleryButton.classList.add('hidden');
      this.switchButton.classList.add('hidden');

      // Display the cancel button, and make sure it's enabled
      this.cancelPickButton.classList.remove('hidden');
      this.cancelPickButton.removeAttribute('disabled');

      if (typeof types === 'string') {
        types = [types];
      }

      var allowedTypes = { 'image': false, 'video': false};
      types.forEach(function(type) {
        var typePrefix = type.split('/')[0];
        allowedTypes[typePrefix] = true;
      });

      if (allowedTypes.image && allowedTypes.video) {
        this.switchButton.classList.remove('hidden');
        this.switchButton.removeAttribute('disabled');
      } else if (allowedTypes.video) {
        mode = this.VIDEO;
      }
    } else { // record
      if (types === 'videos') {
        mode = this.VIDEO;
      }
    }

    if (!this._initialised) {
      this.setCaptureMode(mode);
      this.init();
    } else if (this._captureMode !== mode) {
      // I dont think it is currently possible to get a pick activity
      // with an initialised camera, but it may be in the future
      this.changeMode(mode);
    }
  },

  screenTimeout: function camera_screenTimeout() {
    if (screenLock && !returnToCamera) {
      screenLock.unlock();
      screenLock = null;
    }
  },
  screenWakeLock: function camera_screenWakeLock() {
    if (!screenLock && returnToCamera) {
      screenLock = navigator.requestWakeLock('screen');
    }
  },
  setReturnToCamera: function camera_setReturnToCamera() {
    returnToCamera = true;
  },
  resetReturnToCamera: function camera_resetReturnToCamera() {
    returnToCamera = false;
  },

  enableButtons: function camera_enableButtons() {
    this.captureButton.removeAttribute('disabled');
    this.switchButton.removeAttribute('disabled');

    if (this._pendingPick) {
      this.cancelPickButton.removeAttribute('disabled', 'disabled');
    }
  },

  disableButtons: function camera_disableButtons() {
    this.switchButton.setAttribute('disabled', 'disabled');
    this.captureButton.setAttribute('disabled', 'disabled');

    if (this._pendingPick) {
      this.cancelPickButton.setAttribute('disabled', 'disabled');
    }
  },

  showConfirmation: function camera_showConfirmation(show) {
    var controls = document.getElementById('controls');
    var confirmation = document.getElementById('confirmation');

    if (show) {
      controls.classList.add('hidden');
      confirmation.classList.remove('hidden');
    }
    else {
      controls.classList.remove('hidden');
      confirmation.classList.add('hidden');
    }
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

    var newMode = (this._captureMode === this.CAMERA) ?
      this.VIDEO : this.CAMERA;
    this.changeMode(newMode);
  },

  changeMode: function(mode) {
    this.disableButtons();
    this.setCaptureMode(mode);
    this.updateFlashUI();
    this.enableCameraFeatures(this._cameraObj.capabilities);

    function gotPreviewStream(stream) {
      this.viewfinder.mozSrcObject = stream;
      this.viewfinder.play();
      this.enableButtons();
    }
    if (this._captureMode === this.CAMERA) {
      this._cameraObj.getPreviewStream(this._previewConfig,
                                       gotPreviewStream.bind(this));
    } else {
      this._videoProfile.rotation = this._phoneOrientation;
      this._cameraObj.getPreviewStreamVideoMode(this._videoProfile,
                                                gotPreviewStream.bind(this));
    }
  },

  toggleCamera: function camera_toggleCamera() {
    this._camera = 1 - this._camera;
    // turn off flash light before switch to front camera
    var flash = this._flashState[this._captureMode];
    flash.currentMode = 0;
    this.updateFlashUI();
    this.loadCameraPreview(this._camera, this.enableButtons.bind(this));
    this.setToggleCameraStyle();
  },

  setToggleCameraStyle: function camera_setToggleCameraStyle() {
    var modeName = this._camera === 0 ? 'back' : 'front';
    this.toggleButton.setAttribute('data-mode', modeName);
  },

  updateFlashUI: function camera_updateFlashUI() {
    var flash = this._flashState[this._captureMode];
    if (flash.supported) {
      this.setFlashMode();
      this.toggleFlashBtn.classList.remove('hidden');
    } else {
      this.toggleFlashBtn.classList.add('hidden');
    }
  },

  toggleFlash: function camera_toggleFlash() {
    var flash = this._flashState[this._captureMode];
    flash.currentMode = (flash.currentMode + 1) % flash.modes.length;
    this.setFlashMode();
  },

  setFlashMode: function camera_setFlashMode() {
    var flash = this._flashState[this._captureMode];
    var flashModeName = flash.modes[flash.currentMode];
    this.toggleFlashBtn.setAttribute('data-mode', flashModeName);
    this._cameraObj.flashMode = flashModeName;
  },

  toggleRecording: function camera_toggleRecording() {
    if (this._recording) {
      this.stopRecording();
      return;
    }
    // Hide the filmstrip to prevent the users from
    // entering the preview mode after Camera starts recording button pressed
    if (Filmstrip.isShown())
      Filmstrip.hide();

    this.startRecording();
  },

  startRecording: function camera_startRecording() {
    this.toggleButton.classList.add('hidden');
    this._sizeLimitAlertActive = false;
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

      // User closed app while recording was trying to start
      if (document.hidden) {
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

      if (this._pendingPick && this._pendingPick.source.data.maxFileSizeBytes) {
        var maxFileSizeBytes = this._pendingPick.source.data.maxFileSizeBytes;
        config.maxFileSizeBytes = Math.min(config.maxFileSizeBytes,
                                           maxFileSizeBytes);
      }
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
      req.onsuccess = (function fileCreated(e) {
        // Extract video root directory string
        var absolutePath = e.target.result;
        var rootDirLength = absolutePath.length - dummyfilename.length;
        this._videoRootDir = absolutePath.substring(0, rootDirLength);

        this._videoStorage.delete(absolutePath); // No need to wait for success
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
    this.toggleButton.classList.remove('hidden');
    var self = this;
    this._cameraObj.stopRecording();
    this._recording = false;
    // Register a listener for writing completion of current video file
    (function(videoStorage, videofile) {
      videoStorage.addEventListener('change', function changeHandler(e) {
        // Regard the modification as video file writing completion if e.path
        // matches current video filename. Note e.path is absolute path.
        if (e.reason === 'modified' && e.path === videofile) {
          // Un-register the listener itself
          videoStorage.removeEventListener('change', changeHandler);
          if (self._pendingPick) {
            // call Filmstrip.addVideo to generate poster image for gallery
            Filmstrip.addVideo(videofile);
            self._savedMedia = videofile;
            self.stopPreview();
            self.showConfirmation(true);
          } else {
            Filmstrip.addVideo(videofile);
            Filmstrip.show(Camera.FILMSTRIP_DURATION);
          }
        }
      });
    })(this._videoStorage, this._videoRootDir + this._videoPath);

    window.clearInterval(this._videoTimer);
    this.enableButtons();
    document.body.classList.remove('capturing');
  },

  formatTimer: function camera_formatTimer(time) {
    var minutes = Math.floor(time / 60);
    var seconds = Math.round(time % 60);
    if (minutes < 60) {
      return padLeft(minutes, 2) + ':' + padLeft(seconds, 2);
    } else {
      var hours = Math.floor(minutes / 60);
      minutes = Math.round(minutes % 60);
      return hours + ':' + padLeft(minutes, 2) + ':' + padLeft(seconds, 2);
    }
    return '';
  },

  capturePressed: function camera_doCapture(e) {
    if (e.target.getAttribute('disabled')) {
      return;
    }

    if (this._captureMode === this.CAMERA) {
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
    var orientation =
      (e.beta < -45 && e.beta > -135) ? 0 :
      (e.beta > 45 && e.beta < 135) ? 180 :
      (e.gamma < -45 && e.gamma > -135) ? 90 :
      (e.gamma > 45 && e.gamma < 135) ? 270 :
      this._phoneOrientation;

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
    if (this._captureMode) {
      document.body.classList.remove(this._captureMode);
    }
    this._captureMode = mode;
    document.body.classList.add(mode);
  },

  toggleFilmStrip: function camera_toggleFilmStrip(ev) {
    // We will just ignore
    // because the filmstrip shouldn't be shown
    // while Camera is recording
    if (this._recording || this._pendingPick)
      return;

    if (Filmstrip.isShown())
      Filmstrip.hide();
    else
      Filmstrip.show();
  },

  loadCameraPreview: function camera_loadCameraPreview(camera, callback) {

    this.viewfinder.mozSrcObject = null;
    this._timeoutId = 0;
    this._cameras = navigator.mozCameras.getListOfCameras();
    var options = {camera: this._cameras[this._camera]};

    function gotPreviewScreen(stream) {
      this.viewfinder.mozSrcObject = stream;
      this.viewfinder.play();

      if (callback) {
        callback();
      }

      this._previewActive = true;
    }

    function gotCamera(camera) {
      this._cameraObj = camera;
      this._autoFocusSupported =
        camera.capabilities.focusModes.indexOf('auto') !== -1;
      this._pictureSize =
        this.pickPictureSize(camera.capabilities.pictureSizes);
      this._videoProfile =
        this.pickVideoProfile(camera.capabilities.recorderProfiles);

      this.setPreviewSize(camera);
      this.enableCameraFeatures(camera.capabilities);

      camera.onShutter = (function() {
        if (this._shutterSoundEnabled) {
          this._shutterSound.play();
        }
      }).bind(this);
      camera.onRecorderStateChange = this.recordingStateChanged.bind(this);
      if (this._captureMode === this.CAMERA) {
        camera.getPreviewStream(this._previewConfig,
                                gotPreviewScreen.bind(this));
      } else {
        this._videoProfile.rotation = this._phoneOrientation;
        this._cameraObj.getPreviewStreamVideoMode(this._videoProfile,
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

  setPreviewSize: function(camera) {

    var viewfinder = this.viewfinder;
    var style = viewfinder.style;
    // Switch screen dimensions to landscape
    var screenWidth = document.body.clientHeight;
    var screenHeight = document.body.clientWidth;
    var pictureAspectRatio = this._pictureSize.height / this._pictureSize.width;
    var screenAspectRatio = screenHeight / screenWidth;

    // Previews should match the aspect ratio and not be smaller than the screen
    var validPreviews = camera.capabilities.previewSizes.filter(function(res) {
      var isLarger = res.height >= screenHeight && res.width >= screenWidth;
      var aspectRatio = res.height / res.width;
      var matchesRatio = Math.abs(aspectRatio - pictureAspectRatio) < 0.05;
      return matchesRatio && isLarger;
    });

    // We should always have a valid preview size, but just in case
    // we dont, pick the first provided.
    if (validPreviews.length) {
      // Pick the smallest valid preview
      this._previewConfig = validPreviews.sort(function(a, b) {
        return a.width * a.height - b.width * b.height;
      }).shift();
    } else {
      this._previewConfig = camera.capabilities.previewSizes[0];
    }

    var transform = 'rotate(90deg)';
    var width, height;
    var translateX = 0;

    // The preview should be larger than the screen, shrink it so that as
    // much as possible is on screen.
    if (screenAspectRatio < pictureAspectRatio) {
      width = screenWidth;
      height = screenWidth * pictureAspectRatio;
    } else {
      width = screenHeight / pictureAspectRatio;
      height = screenHeight;
    }

    if (this._camera == 1) {
      /* backwards-facing camera */
      transform += ' scale(-1, 1)';
      translateX = width;
    }

    // Counter the position due to the rotation
    // This translation goes after the rotation so the element is shifted up
    // (for back camera) - shifted up after it is rotated 90 degress clockwise.
    // (for front camera) - shifted up-left after it is mirrored and rotated.
    transform += ' translate(-' + translateX + 'px, -' + height + 'px)';

    // Now add another translation at to center the viewfinder on the screen.
    // We put this at the start of the transform, which means it is applied
    // last, after the rotation, so width and height are reversed.
    var dx = -(height - screenHeight) / 2;
    var dy = -(width - screenWidth) / 2;
    transform = 'translate(' + dx + 'px,' + dy + 'px) ' + transform;

    style.transform = transform;
    style.width = width + 'px';
    style.height = height + 'px';
  },

  recordingStateChanged: function(msg) {
    if (msg === 'FileSizeLimitReached' && !this.sizeLimitAlertActive) {
      this.stopRecording();
      this.sizeLimitAlertActive = true;
      var alertText = this._pendingPick ? 'activity-size-limit-reached' :
        'size-limit-reached';
      alert(navigator.mozL10n.get(alertText));
      this.sizeLimitAlertActive = false;
    }
  },

  enableCameraFeatures: function camera_enableCameraFeatures(capabilities) {
    if (this._cameras.length > 1) {
      this.toggleButton.classList.remove('hidden');
    } else {
      this.toggleButton.classList.add('hidden');
    }

    // For checking flash support
    function isSubset(subset, set) {
      for (var i = 0; i < subset.length; i++) {
        if (set.indexOf(subset[i]) == -1)
          return false;
      }
      return true;
    }

    var flashModes = capabilities.flashModes;
    if (flashModes) {
      // Check camera flash support
      var flash = this._flashState[this.CAMERA];
      flash.supported = isSubset(flash.modes, flashModes);

      // Check video flash support
      flash = this._flashState[this.VIDEO];
      flash.supported = isSubset(flash.modes, flashModes);

      this.updateFlashUI();
    } else {
      this.toggleFlashBtn.classList.add('hidden');
    }
  },

  startPreview: function camera_startPreview() {
    this.screenWakeLock();
    this.viewfinder.play();
    this.loadCameraPreview(this._camera, this.previewEnabled.bind(this));
    this._previewActive = true;
  },

  previewEnabled: function() {
    this.enableButtons();
    if (!this._pendingPick) {
      setTimeout(this.initPositionUpdate.bind(this), this.PROMPT_DELAY);
    }
  },

  stopPreview: function camera_stopPreview() {
    this.screenTimeout();
    if (this._recording) {
      this.stopRecording();
    }
    this.hideFocusRing();
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

  takePictureError: function camera_takePictureError() {
    alert(navigator.mozL10n.get('error-saving-title') + '. ' +
          navigator.mozL10n.get('error-saving-text'));
  },

  takePictureSuccess: function camera_takePictureSuccess(blob) {
    this._config.position = null;
    this._manuallyFocused = false;
    this.hideFocusRing();

    if (this._pendingPick) {
      this.showConfirmation(true);

      // Just save the blob temporarily until the user presses "Retake" or
      // "Select".
      this._savedMedia = blob;
      return;
    }

    this.resumePreview();
    this._addPictureToStorage(blob, function(name, absolutePath) {
      Filmstrip.addImage(absolutePath, blob);
      Filmstrip.show(Camera.FILMSTRIP_DURATION);
      this.checkStorageSpace();
    }.bind(this));
  },

  retakePressed: function camera_retakePressed() {
    this._savedMedia = null;
    this.showConfirmation(false);
    this.cancelPickButton.removeAttribute('disabled');
    if (this._captureMode === this.CAMERA) {
      this.resumePreview();
    } else {
      this.startPreview();
    }
  },

  selectPressed: function camera_selectPressed() {
    var self = this;
    var media = this._savedMedia;
    this._savedMedia = null;
    this.showConfirmation(false);
    if (this._captureMode === this.CAMERA) {
      this._addPictureToStorage(media, function(name, absolutePath) {
        this._resizeBlobIfNeeded(media, function(resized_blob) {
          this._pendingPick.postResult({
            type: 'image/jpeg',
            blob: resized_blob,
            name: name
          });
          this._pendingPick = null;
        }.bind(this));
      }.bind(this));
    } else {
      var request = Camera._videoStorage.get(media);
      request.onerror = function() {
        console.warn('addVideo:', media, request.error.name);
      };
      request.onsuccess = function() {
        var blob = request.result;
        self._pendingPick.postResult({
          type: 'video/3gpp',
          blob: blob,
          name: media
        });
        self._pendingPick = null;
      };
    }
  },

  _addPictureToStorage: function camera_addPictureToStorage(blob, callback) {
    DCFApi.createDCFFilename(this._pictureStorage, 'image',
                             function(path, name) {
      var addreq = this._pictureStorage.addNamed(blob, path + name);
      addreq.onsuccess = function(e) {
        var absolutePath = e.target.result;
        callback(path + name, absolutePath);
      };
      addreq.onerror = this.takePictureError;
    }.bind(this));
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

    // Remove filmstrip item if its correspondent file is deleted
    case 'deleted':
      Filmstrip.deleteItem(e.path);
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
      // not trigger preview while in pick mode
      if (!this._previewActive && !document.hidden && !this._pendingPick) {
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
    if (this._autoFocusSupported && !this._manuallyFocused) {
      this.focusRing.setAttribute('data-state', 'focusing');
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

    if (this._pendingPick) {
      this.overlayMenuGroup.classList.remove('hidden');
    } else {
      this.overlayMenuGroup.classList.add('hidden');
    }

    this.overlayTitle.textContent = navigator.mozL10n.get(id + '-title');
    this.overlayText.textContent = navigator.mozL10n.get(id + '-text');
    this.overlay.classList.remove('hidden');
  },

  pickPictureSize: function camera_pickPictureSize(pictureSizes) {
    var targetSize = null;
    var targetFileSize = 0;
    if (this._pendingPick && this._pendingPick.source.data.maxFileSizeBytes) {
      // we use worse case of all compression method: gif, jpg, png
      targetFileSize = this._pendingPick.source.data.maxFileSizeBytes;
    }
    if (this._pendingPick && this._pendingPick.source.data.width &&
        this._pendingPick.source.data.height) {
      // if we have pendingPick with width and height, set it as target size.
      targetSize = {'width': this._pendingPick.source.data.width,
                    'height': this._pendingPick.source.data.height};
    }
    var maxRes = this.MAX_IMAGE_RES;
    var estimatedJpgSize = this.ESTIMATED_JPEG_FILE_SIZE;
    var size = pictureSizes.reduce(function(acc, size) {
      var mp = size.width * size.height;
      // we don't need the resolution larger than maxRes
      if (mp > maxRes) {
        return acc;
      }
      // We assume the relationship between MP to file size is linear.
      // This may be inaccurate on all cases.
      var estimatedFileSize = mp * estimatedJpgSize / maxRes;
      if (targetFileSize > 0 && estimatedFileSize > targetFileSize) {
        return acc;
      }

      if (targetSize) {
        // find a resolution both width and height are large than pick size
        if (size.width < targetSize.width || size.height < targetSize.height) {
          return acc;
        }
        // it's first pictureSize.
        if (!acc.width || acc.height) {
          return size;
        }
        // find large enough but as small as possible.
        return (mp < acc.width * acc.height) ? size : acc;
      } else {
        // no target size, find as large as possible.
        return (mp > acc.width * acc.height && mp <= maxRes) ? size : acc;
      }
    }, {width: 0, height: 0});

    if (size.width === 0 && size.height === 0) {
      return pictureSizes[0];
    } else {
      return size;
    }
  },

  pickVideoProfile: function camera_pickVideoProfile(profiles) {
    var profileName;
    // Attempt to find low resolution profile if accessed via pick activity
    if (this._pendingPick && this._pendingPick.source.data.maxFileSizeBytes &&
        'qcif' in profiles) {
      profileName = 'qcif';
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
  },

  initPositionUpdate: function camera_initPositionUpdate() {
    if (this._watchId || document.hidden) {
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

document.addEventListener('visibilitychange', function() {
  if (document.hidden) {
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
