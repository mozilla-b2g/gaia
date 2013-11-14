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

var screenLock = null;
var Camera = {
  _cameras: null,
  _captureMode: null,

  // In secure mode the user cannot browse to the gallery
  _secureMode: window.parent !== window,
  _currentOverlay: null,

  _videoTimer: null,
  _videoStart: null,
  _videoPath: null, // file path relative to video root directory
  _videoRootDir: null, // video root directory string

  _autoFocusSupport: {},
  _callAutoFocus: false,

  _timeoutId: 0,
  _cameraObj: null,

  _photosTaken: [],
  _cameraProfile: null,

  _phoneOrientation: 0,

  _pictureStorage: null,
  _videoStorage: null,
  _storageState: null,

  _pictureSize: null,
  _previewConfig: null,

  // We can recieve multiple FileSizeLimitReached events
  // when recording, since we stop recording on this event
  // only show one alert per recording
  _sizeLimitAlertActive: false,

  _flashState: {
    camera: {
      defaultMode: 1,
      supported: [], // delay the array initialization to enableCameraFeatures.
      modes: ['off', 'auto', 'on'],
      currentMode: [] // default flash mode is 'auto'
                      // delay the array initialization when needed.
    },
    video: {
      defaultMode: 0,
      supported: [], // delay the array initialization to enableCameraFeatures.
      modes: ['off', 'torch'],
      currentMode: [] // default flash mode is 'off'
                      // delay the array initialization when needed.
    }
  },

  _config: {
    fileFormat: 'jpeg'
  },

  _videoProfile: {},

  preferredRecordingSizes: null,

  _watchId: null,
  _position: null,

  _pendingPick: null,
  _savedMedia: null,

  get overlayTitle() {
    return document.getElementById('overlay-title');
  },

  get overlayText() {
    return document.getElementById('overlay-text');
  },

  get overlay() {
    return document.getElementById('overlay');
  },

  get storageSettingButton() {
    return document.getElementById('storage-setting-button');
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

  get flashName() {
    return document.querySelector('.js-flash-name');
  },

  get cancelPickButton() {
    return document.getElementById('cancel-pick');
  },

  get overlayCloseButton() {
    return document.getElementById('overlay-close-button');
  },

  get overlayMenuClose() {
    return document.getElementById('overlay-menu-close');
  },

  get overlayMenuStorage() {
    return document.getElementById('overlay-menu-storage');
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
    
    requirejs.config({ baseUrl: 'js' });
    
    var requires = [
      'models/state',
      'models/settings',
      'views/viewfinder',
      'views/controls',
      'controllers/app',
      'dcf',
      'constants',
      '/shared/js/async_storage.js',
      '/shared/js/blobview.js',
      '/shared/js/media/jpeg_metadata_parser.js',
      '/shared/js/media/get_video_rotation.js',
      '/shared/js/media/video_player.js',
      '/shared/js/media/media_frame.js',
      '/shared/js/gesture_detector.js',
      '/shared/js/lazy_l10n.js',
      'panzoom',
      'views/filmstrip',
      'confirm',
      'soundeffect',
      'orientation'
    ];

    require(requires, function(CameraState,
                               CameraSettings,
                               ViewfinderView,
                               ControlsView,
                               AppController,
                               DCF) {

      window.CameraState = CameraState;
      window.CameraSettings = CameraSettings;

      window.ViewfinderView = new ViewfinderView(document.getElementById('viewfinder'));
      window.ControlsView = new ControlsView(document.getElementById('controls'));

      window.AppController = new AppController({
        ViewfinderView: window.ViewfinderView,
        ControlsView: window.ControlsView
      });

      window.DCFApi = DCF;

      // The activity may have defined a captureMode, otherwise
      // be default we use the camera
      if (Camera._captureMode === null) {
        Camera.setCaptureMode(CAMERA_MODE_TYPE.CAMERA);
      }

      Camera.loadCameraPreview(CameraState.get('cameraNumber'), function() {
        PerformanceTestingHelper.dispatch('camera-preview-loaded');

        Camera.checkStorageSpace();
      });

      LazyL10n.get(function localized() {
        Camera.delayedInit();
      });
    });

    var files = [
      'style/filmstrip.css',
      'style/confirm.css',
      'style/VideoPlayer.css'
    ];

    loader.load(files);
  },

  delayedInit: function camera_delayedInit() {
    if (!this._pendingPick) {
      CameraState.set({
        modeButtonHidden: false,
        galleryButtonHidden: false
      });
    }

    this.enableButtons();

    // Dont let the phone go to sleep while the camera is
    // active, user must manually close it
    this.requestScreenWakeLock();

    this.setToggleCameraStyle();

    this.toggleButton.addEventListener('click', this.toggleCamera.bind(this));
    this.toggleFlashBtn.addEventListener('click', this.toggleFlash.bind(this));
    
    CameraOrientation.addEventListener('orientation', this.handleOrientationChanged.bind(this));

    this.overlayCloseButton
      .addEventListener('click', this.cancelPick.bind(this));
    this.storageSettingButton
      .addEventListener('click', this.storageSettingPressed.bind(this));

    if (!navigator.mozCameras) {
      CameraState.set('captureButtonEnabled', false);
      return;
    }

    if (this._secureMode) {
      CameraState.set('galleryButtonEnabled', false);
    }

    CameraOrientation.start();
    SoundEffect.init();

    if ('mozSettings' in navigator) {
      this.getPreferredSizes();
    }

    this._storageState = STORAGE_STATE_TYPE.INIT;

    this._pictureStorage = navigator.getDeviceStorage('pictures');
    this._videoStorage = navigator.getDeviceStorage('videos'),

    this._pictureStorage
      .addEventListener('change', this.deviceStorageChangeHandler.bind(this));

    this.previewEnabled();

    CameraState.set('initialized', true);
    
    DCFApi.init();
    PerformanceTestingHelper.dispatch('startup-path-done');
  },

  handleActivity: function camera_handleActivity(activity) {
    // default to allow both photos and videos
    var types = activity.source.data.type || ['image/*', 'video/*'];
    var mode = CAMERA_MODE_TYPE.CAMERA;

    if (activity.source.name === 'pick') {
      // When inside an activity the user cannot switch between
      // the gallery or video recording.
      this._pendingPick = activity;

      CameraState.set({

        // Hide the gallery and switch buttons, leaving only the shutter
        modeButtonHidden: true,
        galleryButtonHidden: true,

        // Display the cancel button, and make sure it's enabled
        cancelPickButtonHidden: false,
        cancelPickButtonEnabled: true
      });

      if (typeof types === 'string') {
        types = [types];
      }

      var allowedTypes = { 'image': false, 'video': false};
      types.forEach(function(type) {
        var typePrefix = type.split('/')[0];
        allowedTypes[typePrefix] = true;
      });

      if (allowedTypes.image && allowedTypes.video) {
        CameraState.set({
          modeButtonHidden: false,
          modeButtonEnabled: true
        });
      } else if (allowedTypes.video) {
        mode = CAMERA_MODE_TYPE.VIDEO;
      }
    } else { // record
      if (types === 'videos') {
        mode = CAMERA_MODE_TYPE.VIDEO;
      }
    }

    if (!CameraState.get('initialized')) {
      this.setCaptureMode(mode);
      this.init();
    } else if (this._captureMode !== mode) {
      // I dont think it is currently possible to get a pick activity
      // with an initialized camera, but it may be in the future
      this.changeMode(mode);
    }
  },

  releaseScreenWakeLock: function camera_releaseScreenWakeLock() {
    if (screenLock && Filmstrip.isPreviewShown()) {
      screenLock.unlock();
      screenLock = null;
    }
  },
  requestScreenWakeLock: function camera_requestScreenWakeLock() {
    if (!screenLock && !Filmstrip.isPreviewShown()) {
      screenLock = navigator.requestWakeLock('screen');
    }
  },

  enableButtons: function camera_enableButtons() {
    CameraState.enableButtons();

    this.toggleFlashBtn.removeAttribute('disabled');
  },

  disableButtons: function camera_disableButtons() {
    CameraState.disableButtons();

    this.toggleFlashBtn.setAttribute('disabled', 'disabled');
  },

  cancelPick: function camera_cancelPick() {
    if (this._pendingPick) {
      this._pendingPick.postError('pick cancelled');
    }
    this._pendingPick = null;
  },

  changeMode: function(mode) {
    this.disableButtons();
    this.setCaptureMode(mode);
    this.updateFlashUI();
    this.enableCameraFeatures(this._cameraObj.capabilities);
    this.setFocusMode();

    function gotPreviewStream(stream) {
      ViewfinderView.setPreviewStream(stream);
      ViewfinderView.startPreview();
    }
    Camera._cameraObj.onPreviewStateChange = function(state) {
      // We disabled the buttons above. Now we wait for the preview
      // stream to actually start up before we enable them again. If we
      // do this in the getPreviewStream() callback it might be too early
      // and we can still cause deadlock in the camera hardware.
      // See Bug 890427.
      if (state === 'started') {
        Camera.enableButtons();
        // Only do this once
        Camera._cameraObj.onPreviewStateChange = null;
      }
    };
    if (this._captureMode === CAMERA_MODE_TYPE.CAMERA) {
      this._cameraObj.getPreviewStream(this._previewConfig,
                                       gotPreviewStream.bind(this));
    } else {
      this._videoProfile.rotation = this._phoneOrientation;
      this._cameraObj.getPreviewStreamVideoMode(this._videoProfile,
                                                gotPreviewStream.bind(this));
    }
  },

  toggleCamera: function camera_toggleCamera() {
    var stateClass = 'is-toggling-camera';
    var bodyClasses = document.body.classList;
    var fadeTime = 800;
    var self = this;

    // turn off flash light
    // before switch to front camera
    var cameraNumber = 1 - CameraState.get('cameraNumber');
    
    this.updateFlashUI();

    // Disable the buttons so
    // the user can't use them
    // while we're switching.
    // Then add the state class
    // to the body to cause the
    // viewfinder to fade out.
    this.disableButtons();

    bodyClasses.add(stateClass);
    setTimeout(onFadeFinish, fadeTime);

    function onFadeFinish() {
      self.loadCameraPreview(cameraNumber, function() {
        self.enableButtons();
        bodyClasses.remove(stateClass);
      });
    }

    this.loadCameraPreview(cameraNumber, this.enableButtons.bind(this));
    this.setToggleCameraStyle();

    CameraState.set('cameraNumber', cameraNumber);
  },

  setToggleCameraStyle: function camera_setToggleCameraStyle() {
    var cameraNumber = CameraState.get('cameraNumber');
    var modeName = cameraNumber === 0 ? 'back' : 'front';
    this.toggleButton.setAttribute('data-mode', modeName);
  },

  updateFlashUI: function camera_updateFlashUI() {
    var flash = this._flashState[this._captureMode];
    var cameraNumber = CameraState.get('cameraNumber');
    if (flash.supported[cameraNumber]) {
      this.setFlashMode();
      this.toggleFlashBtn.classList.remove('hidden');
    } else {
      this.toggleFlashBtn.classList.add('hidden');
      // alsways set flash mode as off while it is not supported.
      // It may be very useful at the case of video.
      this._cameraObj.flashMode = flash.modes[0];
    }
  },

  turnOffFlash: function camera_turnOffFlash() {
    var flash = this._flashState[this._captureMode];
    var cameraNumber = CameraState.get('cameraNumber');
    flash.currentMode[cameraNumber] = 0;
    this.setFlashMode();
  },

  // isAuto: true if caller want to set it as auto; false for always light.
  // Auto mode only works when camera is currently at camera mode (not video).
  turnOnFlash: function camera_turnOnFlash(isAuto) {
    var flash = this._flashState[this._captureMode];
    var cameraNumber = CameraState.get('cameraNumber');
    if (this._captureMode === CAMERA_MODE_TYPE.CAMERA) {
      flash.currentMode[cameraNumber] = isAuto ? 1 : 2;
    } else {
      flash.currentMode[cameraNumber] = 1;
    }
    this.setFlashMode();
  },

  toggleFlash: function camera_toggleFlash() {
    var flash = this._flashState[this._captureMode];
    var cameraNumber = CameraState.get('cameraNumber');
    var numModes = flash.modes.length;
    var next = (flash.currentMode[cameraNumber] + 1) % numModes;
    var toggleBtn = this.toggleFlashBtn;
    var cls = 'is-toggling';

    flash.currentMode[cameraNumber] = next;

    this.setFlashMode();

    // Add the toggle state class,
    // then remove it after 1 second
    // of inactivity. We use this class
    // to show the flash name text.
    toggleBtn.classList.add(cls);
    clearTimeout(this.toggleTimer);
    this.toggleTimer = setTimeout(function() {
      toggleBtn.classList.remove(cls);
    }, 1000);
  },

  setFlashMode: function camera_setFlashMode() {
    var flash = this._flashState[this._captureMode];
    var cameraNumber = CameraState.get('cameraNumber');
    if ((typeof flash.currentMode[cameraNumber]) === 'undefined') {
      flash.currentMode[cameraNumber] = flash.defaultMode;
    }

    var flashModeName = flash.modes[flash.currentMode[cameraNumber]];

    this.toggleFlashBtn.setAttribute('data-mode', flashModeName);
    this.flashName.textContent = flashModeName;
    this._cameraObj.flashMode = flashModeName;
  },

  setFocusMode: function camera_setFocusMode() {
    this._callAutoFocus = false;
    if (this._captureMode === CAMERA_MODE_TYPE.CAMERA) {
      if (this._autoFocusSupport[FOCUS_MODE_TYPE.CONTINUOUS_CAMERA]) {
        this._cameraObj.focusMode = FOCUS_MODE_TYPE.CONTINUOUS_CAMERA;
        return;
      }
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
  },

  capture: function camera_capture() {
    if (Camera._captureMode === CAMERA_MODE_TYPE.CAMERA) {
      Camera.prepareTakePicture();
      return;
    }

    var recording = CameraState.get('recording');
    if (recording) {
      this.stopRecording();
    }

    else {
      this.startRecording();
    }
  },

  startRecording: function camera_startRecording() {
    // document.body.classList.add('recording');
    this._sizeLimitAlertActive = false;

    var onerror = function() {
      handleError('error-recording');
    };
    var onsuccess = (function onsuccess() {
      document.body.classList.add('capturing');
      // If the duration is too short, there may be no track been record. That
      // creates corrupted video files. Because media file needs some samples.
      // To have more information on video track, we wait for 500ms to have
      // few video and audio samples, see bug 899864.
      window.setTimeout(function() {
        CameraState.set('captureButtonEnabled', true);
      }, MIN_RECORDING_TIME);

      CameraState.set('recording', true);
      
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
      if (freeBytes < RECORD_SPACE_MIN) {
        handleError('nospace');
        return;
      }

      var config = {
        rotation: this._phoneOrientation,
        maxFileSizeBytes: freeBytes - RECORD_SPACE_PADDING
      };

      if (this._pendingPick && this._pendingPick.source.data.maxFileSizeBytes) {
        var maxFileSizeBytes = this._pendingPick.source.data.maxFileSizeBytes;
        config.maxFileSizeBytes = Math.min(config.maxFileSizeBytes,
                                           maxFileSizeBytes);
      }
      SoundEffect.playRecordingStartSound();
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
    // document.body.classList.remove('recording');
    var self = this;
    this._cameraObj.stopRecording();
    // play camcorder shutter sound while stop recording.
    SoundEffect.playRecordingEndSound();

    CameraState.set('recording', false);

    // Register a listener for writing completion of current video file
    (function(videoStorage, videofile) {
      videoStorage.addEventListener('change', function changeHandler(e) {
        // Regard the modification as video file writing completion if e.path
        // matches current video filename. Note e.path is absolute path.
        if (e.reason === 'modified' && e.path === videofile) {
          // Un-register the listener itself
          videoStorage.removeEventListener('change', changeHandler);

          // Now that the video file has been saved, save a poster
          // image to match it. The Gallery app depends on this.
          self.saveVideoPosterImage(videofile, function(video, poster, data) {

            if (self._pendingPick) {
              self._savedMedia = {
                video: video,
                poster: poster
              };
              ConfirmDialog.confirmVideo(video, poster,
                                         data.width, data.height, data.rotation,
                                         self.selectPressed.bind(self),
                                         self.retakePressed.bind(self));

            } else {
              Filmstrip.addVideo(videofile, video, poster,
                                 data.width, data.height, data.rotation);
              Filmstrip.show(FILMSTRIP_DURATION);
            }
          });
        }
      });
    })(this._videoStorage, this._videoRootDir + this._videoPath);

    window.clearInterval(this._videoTimer);
    this.enableButtons();
    document.body.classList.remove('capturing');
  },

  saveVideoPosterImage: function saveVideoPosterImage(filename, callback) {
    // Given the filename of a newly recorded video, create a poster
    // image for it, and save that poster as a jpeg file. When done,
    // pass the video blob and the poster blob to  the callback function
    // along with the video dimensions and rotation.
    var getreq = this._videoStorage.get(filename);
    getreq.onerror = function() {
      console.warn('saveVideoPosterImage:', filename, request.error.name);
    };
    getreq.onsuccess = function() {
      var videoblob = getreq.result;
      getVideoRotation(videoblob, function(rotation) {
        if (typeof rotation !== 'number') {
          console.warn('Unexpected rotation:', rotation);
          rotation = 0;
        }

        var offscreenVideo = document.createElement('video');
        var url = URL.createObjectURL(videoblob);

        offscreenVideo.preload = 'metadata';
        offscreenVideo.src = url;

        offscreenVideo.onerror = function() {
          URL.revokeObjectURL(url);
          offscreenVideo.removeAttribute('src');
          offscreenVideo.load();
          console.warn('not a video file', filename, 'delete it!');
          // we need to delete all corrupted video files, those of them may be
          // tracks without samples, see bug 899864.
          Camera._videoStorage.delete(filename);
        };

        offscreenVideo.onloadedmetadata = function() {
          var videowidth = offscreenVideo.videoWidth;
          var videoheight = offscreenVideo.videoHeight;

          // First, create a full-size unrotated poster image
          var postercanvas = document.createElement('canvas');
          var postercontext = postercanvas.getContext('2d');
          postercanvas.width = videowidth;
          postercanvas.height = videoheight;
          postercontext.drawImage(offscreenVideo, 0, 0);

          // We're done with the offscreen video element now
          URL.revokeObjectURL(url);
          offscreenVideo.removeAttribute('src');
          offscreenVideo.load();

          // Save the poster image to storage, then call the callback
          // The Gallery app depends on this poster image being saved here
          postercanvas.toBlob(function savePoster(poster) {
            var posterfile = filename.replace('.3gp', '.jpg');
            Camera._pictureStorage.addNamed(poster, posterfile);
            callback(videoblob, poster, {
              width: videowidth,
              height: videoheight,
              rotation: rotation
            });
          }, 'image/jpeg');
        };
      });
    };
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

  handleOrientationChanged: function camera_orientationChanged(orientation) {
    document.body.setAttribute('data-orientation', 'deg' + orientation);

    this._phoneOrientation = orientation;

    Filmstrip.setOrientation(orientation);
    CameraState.set('orientation', orientation);
  },

  setCaptureMode: function camera_setCaptureMode(mode) {
    if (this._captureMode) {
      document.body.classList.remove(this._captureMode);
    }
    this._captureMode = mode;
    document.body.classList.add(mode);
  },

  loadCameraPreview: function camera_loadCameraPreview(cameraNumber, callback) {
    ViewfinderView.setPreviewStream(null);
    this._timeoutId = 0;
    this._cameras = navigator.mozCameras.getListOfCameras();
    var options = {camera: this._cameras[cameraNumber]};

    function gotPreviewScreen(stream) {
      ViewfinderView.setPreviewStream(stream);
      ViewfinderView.startPreview();

      CameraState.set('previewActive', true);

      if (callback) {
        // Even though we have the stream now, the camera hardware hasn't
        // started displaying it yet. We need to wait until the preview
        // has actually started displaying before calling the callback.
        // See Bug 890427.
        Camera._cameraObj.onPreviewStateChange = function(state) {
          if (state === 'started') {
            Camera._cameraObj.onPreviewStateChange = null;
            callback();
          }
        };
      }

    }

    function gotCamera(camera) {
      var thumbnailSize;
      var availableThumbnailSizes = camera.capabilities.thumbnailSizes;
      this._cameraObj = camera;

      var autoFocusSupported = camera.capabilities.focusModes.indexOf('auto') !== -1;
      CameraState.set('autoFocusSupported', autoFocusSupported);

      this.pickPictureSize(camera);
      thumbnailSize = this.selectThumbnailSize(availableThumbnailSizes,
                                               this._pictureSize);
      if (thumbnailSize) {
        camera.thumbnailSize = thumbnailSize;
      }

      this.getPreferredSizes((function() {
        this._videoProfile =
          this.pickVideoProfile(camera.capabilities.recorderProfiles);
          if (this._captureMode === CAMERA_MODE_TYPE.VIDEO) {
            this._videoProfile.rotation = this._phoneOrientation;
            this._cameraObj.getPreviewStreamVideoMode(
              this._videoProfile, gotPreviewScreen.bind(this));
          }
      }).bind(this));
      ViewfinderView.setPreviewSize(camera);
      this.enableCameraFeatures(camera.capabilities);
      this.setFocusMode();

      camera.onShutter = (function() {
        // play shutter sound.
        SoundEffect.playCameraShutterSound();
      }).bind(this);
      camera.onRecorderStateChange = this.recordingStateChanged.bind(this);
      if (this._captureMode === CAMERA_MODE_TYPE.CAMERA) {
        camera.getPreviewStream(this._previewConfig,
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
    if (msg === 'FileSizeLimitReached' && !this.sizeLimitAlertActive) {
      this.stopRecording();
      this.sizeLimitAlertActive = true;
      var alertText = this._pendingPick ? 'activity-size-limit-reached' :
        'storage-size-limit-reached';
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
    var cameraNumber = CameraState.get('cameraNumber');
    if (flashModes) {
      // Check camera flash support
      var flash = this._flashState[CAMERA_MODE_TYPE.CAMERA];
      flash.supported[cameraNumber] = isSubset(flash.modes, flashModes);

      // Check video flash support
      flash = this._flashState[CAMERA_MODE_TYPE.VIDEO];
      flash.supported[cameraNumber] = isSubset(flash.modes, flashModes);

      this.updateFlashUI();
    } else {
      this.toggleFlashBtn.classList.add('hidden');
    }

    var focusModes = capabilities.focusModes;
    if (focusModes) {
      var support = this._autoFocusSupport;
      support[FOCUS_MODE_TYPE.MANUALLY_TRIGGERED] =
        focusModes.indexOf(FOCUS_MODE_TYPE.MANUALLY_TRIGGERED) !== -1;
      support[FOCUS_MODE_TYPE.CONTINUOUS_CAMERA] =
        focusModes.indexOf(FOCUS_MODE_TYPE.CONTINUOUS_CAMERA) !== -1;
      support[FOCUS_MODE_TYPE.CONTINUOUS_VIDEO] =
        focusModes.indexOf(FOCUS_MODE_TYPE.CONTINUOUS_VIDEO) !== -1;
    }
  },

  startPreview: function camera_startPreview() {
    var cameraNumber = CameraState.get('cameraNumber');

    this.requestScreenWakeLock();
    ViewfinderView.startPreview();
    this.loadCameraPreview(cameraNumber, this.previewEnabled.bind(this));

    CameraState.set('previewActive', true);
  },

  previewEnabled: function() {
    this.enableButtons();
    if (!this._pendingPick) {
      setTimeout(this.initPositionUpdate.bind(this), PROMPT_DELAY);
    }
  },

  stopPreview: function camera_stopPreview() {
    try {
      this.releaseScreenWakeLock();

      var recording = CameraState.get('recording');
      if (recording) {
        this.stopRecording();
      }
      this.hideFocusRing();
      this.disableButtons();
      ViewfinderView.stopPreview();

      CameraState.set('previewActive', false);

      ViewfinderView.setPreviewStream(null);
    } catch (ex) {
      console.error('error while stopping preview', ex.message);
    } finally {
      this.release();
    }
  },

  resumePreview: function camera_resumePreview() {
    this._cameraObj.resumePreview();

    CameraState.set('previewActive', true);

    this.enableButtons();
  },

  takePictureError: function camera_takePictureError() {
    alert(navigator.mozL10n.get('error-saving-title') + '. ' +
          navigator.mozL10n.get('error-saving-text'));
  },

  takePictureSuccess: function camera_takePictureSuccess(blob) {
    this._config.position = null;

    CameraState.set('manuallyFocused', false);

    this.hideFocusRing();


    if (this._pendingPick) {
      // If we're doing a Pick, ask the user to confirm the image
      ConfirmDialog.confirmImage(blob,
                                 this.selectPressed.bind(this),
                                 this.retakePressed.bind(this));

      // Just save the blob temporarily until the user presses "Retake" or
      // "Select".
      this._savedMedia = {
        blob: blob
      };
    }
    else {
      // Otherwise (this is the normal case) start the viewfinder again
      this.resumePreview();
    }

    // In either case, save the photo to device storage
    this._addPictureToStorage(blob, function(name, absolutePath) {
      Filmstrip.addImage(absolutePath, blob);
      Filmstrip.show(FILMSTRIP_DURATION);
      this.checkStorageSpace();
    }.bind(this));
  },

  retakePressed: function camera_retakePressed() {
    this._savedMedia = null;
    if (this._captureMode === CAMERA_MODE_TYPE.CAMERA) {
      this.resumePreview();
    } else {
      this.startPreview();
    }
  },

  selectPressed: function camera_selectPressed() {
    var self = this;
    var media = this._savedMedia;
    this._savedMedia = null;
    if (this._captureMode === CAMERA_MODE_TYPE.CAMERA) {
      this._resizeBlobIfNeeded(media.blob, function(resized_blob) {
        this._pendingPick.postResult({
          type: 'image/jpeg',
          blob: resized_blob
        });
        this._pendingPick = null;
      }.bind(this));
    } else {
      this._pendingPick.postResult({
        type: 'video/3gpp',
        blob: media.video,
        poster: media.poster
      });
      this._pendingPick = null;
    }
  },

  storageSettingPressed: function camera_storageSettingPressed() {
    // Click to open the media storage panel when the default storage
    // is unavailable.
    var activity = new MozActivity({
      name: 'configure',
      data: {
        target: 'device',
        section: 'mediaStorage'
      }
    });
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
    if (this._storageState === STORAGE_STATE_TYPE.INIT) {
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
      // not be enough to get back to the STORAGE_STATE_TYPE.AVAILABLE state.
      // To fix this, we need an else clause here, and also a change
      // in the updateOverlay() method.
      if (e.target.result < MAX_IMAGE_SIZE) {
        this._storageState = STORAGE_STATE_TYPE.CAPACITY;
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
      this._storageState = STORAGE_STATE_TYPE.AVAILABLE;
      break;
    case 'unavailable':
      this._storageState = STORAGE_STATE_TYPE.NOCARD;
      if (Filmstrip.isPreviewShown()) {
        // If media frame is shown and storage is unavailable or shared, it may
        // be a video or a picture is opened. We should go back to camera mode
        // to prevent file deleted or file lock. If the video is playing, camera
        // app will be killed becase of mounting as sdcard and file is locked.
        Filmstrip.hidePreview();
      }
      break;
    case 'shared':
      this._storageState = STORAGE_STATE_TYPE.UNMOUNTED;
      if (Filmstrip.isPreviewShown()) {
        // If media frame is shown and storage is unavailable or shared, it may
        // be a video or a picture is opened. We should go back to camera mode
        // to prevent file deleted or file lock. If the video is playing, camera
        // app will be killed becase of mounting as sdcard and file is locked.
        Filmstrip.hidePreview();
      }
      break;
    }
  },

  updateOverlay: function camera_updateOverlay() {
    if (this._storageState === STORAGE_STATE_TYPE.INIT) {
      return false;
    }

    var previewActive = CameraState.get('previewActive');

    if (this._storageState === STORAGE_STATE_TYPE.AVAILABLE) {
      // Preview may have previously been paused if storage
      // was not available
      // Don't start the preview when confirm dialog is showing. The choices of
      // ConfirmDialog call the startPreview or close this activity.
      if (!previewActive && !document.hidden &&
          !ConfirmDialog.isShowing()) {
        this.startPreview();
      }
      this.showOverlay(null);
      return false;
    }

    switch (this._storageState) {
    case STORAGE_STATE_TYPE.NOCARD:
      this.showOverlay('nocard');
      break;
    case STORAGE_STATE_TYPE.UNMOUNTED:
      this.showOverlay('pluggedin');
      break;
    case STORAGE_STATE_TYPE.CAPACITY:
      this.showOverlay('nospace');
      break;
    }
    if (previewActive) {
      this.stopPreview();
    }
    return true;
  },

  prepareTakePicture: function camera_takePicture() {
    this.disableButtons();

    if (this._callAutoFocus) {
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
    this._cameraObj.pictureSize = this._pictureSize;
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

    if (id === 'nocard') {
      this.overlayMenuClose.classList.add('hidden');
      this.overlayMenuStorage.classList.remove('hidden');
    } else {
      if (this._pendingPick) {
        this.overlayMenuClose.classList.remove('hidden');
        this.overlayMenuStorage.classList.add('hidden');
      } else {
        this.overlayMenuClose.classList.add('hidden');
        this.overlayMenuStorage.classList.add('hidden');
      }
    }

    if (id === 'nocard') {
      this.overlayTitle.textContent = navigator.mozL10n.get('nocard2-title');
      this.overlayText.textContent = navigator.mozL10n.get('nocard2-text');
    } else if (id === 'nospace') {
      this.overlayTitle.textContent = navigator.mozL10n.get('nospace2-title');
      this.overlayText.textContent = navigator.mozL10n.get('nospace2-text');
    } else {
      this.overlayTitle.textContent = navigator.mozL10n.get(id + '-title');
      this.overlayText.textContent = navigator.mozL10n.get(id + '-text');
    }
    this.overlay.classList.remove('hidden');
  },

  selectThumbnailSize: function(thumbnailSizes, pictureSize) {
    var i;
    var screenWidth = window.innerWidth * window.devicePixelRatio;
    var screenHeight = window.innerHeight * window.devicePixelRatio;
    var pictureAspectRatio = pictureSize.width / pictureSize.height;
    var currentThumbnailSize;
    var selectedThumbnailSize;
    var currentThumbnailAspectRatio;
    // Coping the array to not modify the original
    var thumbnailSizes = thumbnailSizes.slice(0);
    if (!thumbnailSizes || !pictureSize) {
      return;
    }
    var thumbnailSizes = thumbnailSizes.slice(0);
    function imageSizeFillsScreen(pixelsWidth, pixelsHeight) {
      return ((pixelsWidth >= screenWidth || // portrait
               pixelsHeight >= screenHeight) &&
              (pixelsWidth >= screenHeight || // landscape
               pixelsHeight >= screenWidth));
    };
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
  },

  pickPictureSize: function camera_pickPictureSize(camera) {
    var targetSize = null;
    var targetFileSize = 0;
    var pictureSizes = camera.capabilities.pictureSizes;

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

    // CONFIG_MAX_IMAGE_PIXEL_SIZE is maximum image resolution for still photos
    // taken with camera. It's from config.js which is generated in build time,
    // 5 megapixels by default (see build/application-data.js). It should be
    // synced with Gallery app and update carefully.
    var maxRes = CONFIG_MAX_IMAGE_PIXEL_SIZE;
    var size = pictureSizes.reduce(function(acc, size) {
      var mp = size.width * size.height;
      // we don't need the resolution larger than maxRes
      if (mp > maxRes) {
        return acc;
      }
      // We assume the relationship between MP to file size is linear.
      // This may be inaccurate on all cases.
      var estimatedFileSize = mp * ESTIMATED_JPEG_FILE_SIZE / maxRes;
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
      this._pictureSize = pictureSizes[0];
    } else {
      this._pictureSize = size;
    }
  },

  pickVideoProfile: function camera_pickVideoProfile(profiles) {
    var profileName, matchedProfileName;

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
  },

  getPreferredSizes: function camera_getPreferredSized(callback) {
    var key = 'camera.recording.preferredSizes';
    if (this.preferredRecordingSizes && callback) {
      callback();
      return;
    }

    var req = navigator.mozSettings.createLock().get(key);
    req.onsuccess = (function onsuccess() {
      this.preferredRecordingSizes = req.result[key] || [];
      if (callback) {
        callback();
      }
    }.bind(this));
  }
};

Camera.init();

document.addEventListener('visibilitychange', function() {
  if (document.hidden) {
    Camera.turnOffFlash();
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
  ViewfinderView.setPreviewStream(null);
});
