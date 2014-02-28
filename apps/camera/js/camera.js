'use strict';

var loader = LazyLoader;

var FOCUS_MODE_MANUALLY_TRIGGERED = 'auto';
var FOCUS_MODE_CONTINUOUS_CAMERA = 'continuous-picture';
var FOCUS_MODE_CONTINUOUS_VIDEO = 'continuous-video';

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

    // We haven't loaded the current counters from indexedDB yet, defer
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
var preventGalleryLaunch = false;

var Camera = {
  _initialised: false,
  _cameras: null,
  _cameraNumber: 0,
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

  _autoFocusSupport: {},
  _callAutoFocus: false,

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

  PROMPT_DELAY: 2000,

  _watchId: null,
  _position: null,

  _pendingPick: null,
  _savedMedia: null,

  // The minimum available disk space to start recording a video.
  RECORD_SPACE_MIN: 1024 * 1024 * 2,

  // Number of bytes left on disk to let us stop recording.
  RECORD_SPACE_PADDING: 1024 * 1024 * 1,

  // An estimated JPEG file size is caluclated from 90% quality 24bit/pixel
  ESTIMATED_JPEG_FILE_SIZE: 300 * 1024,

  // Minimum video duration length for creating a video that contains at least
  // few samples, see bug 899864.
  MIN_RECORDING_TIME: 500,

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

    this.loadCameraPreview(this._cameraNumber, function() {
      PerformanceTestingHelper.dispatch('camera-preview-loaded');
      var files = [
        '/shared/js/async_storage.js',
        '/shared/js/blobview.js',
        '/shared/js/media/jpeg_metadata_parser.js',
        '/shared/js/media/get_video_rotation.js',
        '/shared/js/media/video_player.js',
        '/shared/js/media/media_frame.js',
        '/shared/js/gesture_detector.js',
        '/shared/js/lazy_l10n.js',
        'js/panzoom.js',
        'js/filmstrip.js',
        'js/confirm.js',
        'js/soundeffect.js',
        'js/orientation.js'
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
    this.requestScreenWakeLock();

    this.toggleButton.addEventListener('click', this.toggleCamera.bind(this));
    this.toggleFlashBtn.addEventListener('click', this.toggleFlash.bind(this));
    this.viewfinder.addEventListener('click', this.toggleFilmStrip.bind(this));
    CameraOrientation.addEventListener('orientation',
                                      this.handleOrientationChanged.bind(this));

    this.switchButton
      .addEventListener('click', this.toggleModePressed.bind(this));
    this.captureButton
      .addEventListener('click', this.capturePressed.bind(this));
    this.galleryButton
      .addEventListener('click', this.galleryBtnPressed.bind(this));
    this.cancelPickButton
      .addEventListener('click', this.cancelPick.bind(this));
    this.overlayCloseButton
      .addEventListener('click', this.cancelPick.bind(this));

    if (!navigator.mozCameras) {
      this.captureButton.setAttribute('disabled', 'disabled');
      return;
    }

    if (this._secureMode) {
      this.galleryButton.setAttribute('disabled', 'disabled');
    }

    CameraOrientation.start();
    SoundEffect.init();

    if ('mozSettings' in navigator) {
      this.getPreferredSizes();
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
    this.captureButton.removeAttribute('disabled');
    this.switchButton.removeAttribute('disabled');
    this.toggleButton.removeAttribute('disabled');
    this.toggleFlashBtn.removeAttribute('disabled');

    if (this._pendingPick) {
      this.cancelPickButton.removeAttribute('disabled');
    }

    else if (!this._secureMode) {

      // Wait 100ms before re-enabling the Camera button to prevent
      // hammering it and causing a crash (Bug 957709)
      window.setTimeout(function() {
        Camera.galleryButton.removeAttribute('disabled');
      }, 100);
    }
  },

  disableButtons: function camera_disableButtons() {
    this.switchButton.setAttribute('disabled', 'disabled');
    this.captureButton.setAttribute('disabled', 'disabled');
    this.toggleButton.setAttribute('disabled', 'disabled');
    this.toggleFlashBtn.setAttribute('disabled', 'disabled');

    if (this._pendingPick) {
      this.cancelPickButton.setAttribute('disabled', 'disabled');
    }

    else if (!this._secureMode) {
      this.galleryButton.setAttribute('disabled', 'disabled');
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
    this.setFocusMode();

    function gotPreviewStream(stream) {
      this.viewfinder.mozSrcObject = stream;
      this.viewfinder.play();
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
    if (this._captureMode === this.CAMERA) {
      this._cameraObj.getPreviewStream(this._previewConfig,
                                       gotPreviewStream.bind(this));
    } else {
      this._videoProfile.rotation = this.getCameraOrientation();
      this._cameraObj.getPreviewStreamVideoMode(this._videoProfile,
                                                gotPreviewStream.bind(this));
    }
  },

  toggleCamera: function camera_toggleCamera() {
    var stateClass = 'is-toggling-camera';
    var camera = 1 - this._cameraNumber;
    var bodyClasses = document.body.classList;
    var fadeTime = 800;
    var self = this;

    this._cameraNumber = camera;

    // turn off flash light
    // before switch to front camera
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
      self.loadCameraPreview(camera, function() {
        self.enableButtons();
        bodyClasses.remove(stateClass);
      });
    }
  },

  updateFlashUI: function camera_updateFlashUI() {
    var flash = this._flashState[this._captureMode];
    if (flash.supported[this._cameraNumber]) {
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
    flash.currentMode[this._cameraNumber] = 0;
    this.setFlashMode();
  },

  // isAuto: true if caller want to set it as auto; false for always light.
  // Auto mode only works when camera is currently at camera mode (not video).
  turnOnFlash: function camera_turnOnFlash(isAuto) {
    var flash = this._flashState[this._captureMode];
    if (this._captureMode === this.CAMERA) {
      flash.currentMode[this._cameraNumber] = isAuto ? 1 : 2;
    } else {
      flash.currentMode[this._cameraNumber] = 1;
    }
    this.setFlashMode();
  },

  toggleFlash: function camera_toggleFlash() {
    var flash = this._flashState[this._captureMode];
    var cameraNumber = this._cameraNumber;
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
    if ((typeof flash.currentMode[this._cameraNumber]) === 'undefined') {
      flash.currentMode[this._cameraNumber] = flash.defaultMode;
    }

    var flashModeName = flash.modes[flash.currentMode[this._cameraNumber]];

    this.toggleFlashBtn.setAttribute('data-mode', flashModeName);
    this.flashName.textContent = flashModeName;
    this._cameraObj.flashMode = flashModeName;
  },

  setFocusMode: function camera_setFocusMode() {
    this._callAutoFocus = false;
    if (this._captureMode === this.CAMERA) {
      if (this._autoFocusSupport[FOCUS_MODE_CONTINUOUS_CAMERA]) {
        this._cameraObj.focusMode = FOCUS_MODE_CONTINUOUS_CAMERA;
        return;
      }
    } else {
      if (this._autoFocusSupport[FOCUS_MODE_CONTINUOUS_VIDEO]) {
        this._cameraObj.focusMode = FOCUS_MODE_CONTINUOUS_VIDEO;
        return;
      }
    }
    if (this._autoFocusSupport[FOCUS_MODE_MANUALLY_TRIGGERED]) {
      this._cameraObj.focusMode = FOCUS_MODE_MANUALLY_TRIGGERED;
      this._callAutoFocus = true;
    }
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
    document.body.classList.add('recording');
    this._sizeLimitAlertActive = false;
    var captureButton = this.captureButton;
    var switchButton = this.switchButton;

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
        captureButton.removeAttribute('disabled');
      }, Camera.MIN_RECORDING_TIME);
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
        rotation: this.getCameraOrientation(),
        maxFileSizeBytes: freeBytes - this.RECORD_SPACE_PADDING
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
    document.body.classList.remove('recording');
    var self = this;
    this._cameraObj.stopRecording();
    // play camcorder shutter sound while stop recording.
    SoundEffect.playRecordingEndSound();

    this._recording = false;
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
              Filmstrip.show(Camera.FILMSTRIP_DURATION);
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

    // Check flag to determine if we are throttling the launching
    // of Gallery -- Using a flag here instead of disabling the
    // button in the DOM to work around a strange race condition
    if (preventGalleryLaunch) {
      return;
    }

    preventGalleryLaunch = true;

    // Launch the gallery with an activity
    var a = new MozActivity({
      name: 'browse',
      data: {
        type: 'photos'
      }
    });

    // Wait 2000ms before re-enabling the Gallery to be launched (Bug 957709)
    window.setTimeout(function() {
      preventGalleryLaunch = false;
    }, 2000);
  },

  handleOrientationChanged: function camera_orientationChanged(orientation) {
    document.body.setAttribute('data-orientation', 'deg' + orientation);
    this._phoneOrientation = orientation;
    Filmstrip.setOrientation(orientation);
  },

  setCaptureMode: function camera_setCaptureMode(mode) {
    if (this._captureMode) {
      document.body.classList.remove(this._captureMode);
    }
    this._captureMode = mode;
    document.body.classList.add(mode);
  },

  toggleFilmStrip: function camera_toggleFilmStrip(evt) {

    // Ignore if the click did not occur directly on the
    // viewfinder (e.g.: disabled controls)
    if (evt.originalTarget !== this.viewfinder)
      return;

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

  loadCameraPreview: function camera_loadCameraPreview(cameraNumber, callback) {

    this.viewfinder.mozSrcObject = null;
    this._timeoutId = 0;
    this._cameras = navigator.mozCameras.getListOfCameras();
    var options = {camera: this._cameras[cameraNumber]};

    function gotPreviewScreen(stream) {
      this.viewfinder.mozSrcObject = stream;
      this.viewfinder.play();
      this._previewActive = true;

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
      this.pickPictureSize(camera);
      thumbnailSize = this.selectThumbnailSize(availableThumbnailSizes,
                                               this._pictureSize);
      if (thumbnailSize) {
        camera.thumbnailSize = thumbnailSize;
      }
      this.getPreferredSizes((function() {
        this._videoProfile =
          this.pickVideoProfile(camera.capabilities.recorderProfiles);
          if (this._captureMode === this.VIDEO) {
            this._videoProfile.rotation = this._phoneOrientation;
            this._cameraObj.getPreviewStreamVideoMode(
              this._videoProfile, gotPreviewScreen.bind(this));
          }
      }).bind(this));
      this.setPreviewSize(camera);
      this.enableCameraFeatures(camera.capabilities);
      this.setFocusMode();

      camera.onShutter = (function() {
        // play shutter sound.
        SoundEffect.playCameraShutterSound();
      }).bind(this);
      camera.onRecorderStateChange = this.recordingStateChanged.bind(this);
      if (this._captureMode === this.CAMERA) {
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

  setPreviewSize: function(camera) {
    function getRotatedDimension(rotateAngle, width, height) {
      if (rotateAngle % 180 == 0) {
        return [width, height];
      } else {
        return [height, width];
      }
    }

    var viewfinder = this.viewfinder;
    var style = viewfinder.style;
    var screenWidth = window.innerWidth * window.devicePixelRatio;
    var screenHeight = window.innerHeight * window.devicePixelRatio;

    // sensorAngle exposes the orientation of the camera image. The value is
    // the angle that the camera image needs to be rotated clockwise so it shows
    // correctly on the display in its natural orientation. See also:
    // http://developer.android.com/reference/android/hardware/
    // Camera.CameraInfo.html#orientation
    //
    // The visible portion of preview must cover the screen. Camera direction
    // can differ from the device so the preview is rotated before showing on
    // the screen. To compare the minimum preview size really need, instead of
    // rotating every preview candidates, we start by rotating the screen size
    // counter-clockwise to find the size required (the minus sign before
    // sensorAngle).
    //
    // Example: On a 320x480 portrait device with sensorAngle in 90deg, rotating
    // screen size by -90deg retrieves the visible portion of preview should not
    // be smaller than 480x320.
    var [minPreviewWidth, minPreviewHeight] = getRotatedDimension(
                          -camera.sensorAngle, screenWidth, screenHeight);
    var screenAspectRatio = minPreviewWidth / minPreviewHeight;

    var pictureAspectRatio = this._pictureSize.width / this._pictureSize.height;

    // Start with a list of all available preview sizes
    var previews = camera.capabilities.previewSizes;

    // Filter it so we only consider sizes that match the photo size
    previews = previews.filter(function(size) {
      return Math.abs(size.width / size.height - pictureAspectRatio) < 0.05;
    });

    // Sort the previews from smallest to largest
    previews.sort(function(a, b) { return a.width - b.width; });

    // Now loop through these sorted preview sizes and pick the first
    // one that is bigger than or equal to the screen. If we don't
    // find any that is bigger, use the last one. If there are no
    // previews at all, we'll just use the first one that the camera offers us.
    if (previews.length) {
      for (var i = 0; i < previews.length; i++) {
        if (previews[i].width >= minPreviewWidth &&
            previews[i].height >= minPreviewHeight)
          break;
      }
      if (i === previews.length) // If none were big enough
        i = previews.length - 1; // pick the bigest one we've got
      this._previewConfig = previews[i];
    } else { // No valid previews: this should never happen!
      console.warn('Preview size does not have correct aspect ratio.');
      this._previewConfig = camera.capabilities.previewSizes[0];
    }

    // Now we have actual picture aspect ratio to determine actual preview size.
    // The preview should be larger than the screen, shrink it so that as
    // much as possible is on screen.
    //
    // Example: we selected a 512x384 preview (ratio 1.33). The minimum preview
    // size is 480x320 (1.5). So it goes through the following else clause,
    // obtaining 480x360 which covers the whole screen.
    var previewWidth, previewHeight;
    if (screenAspectRatio < pictureAspectRatio) {
      previewWidth = minPreviewHeight * pictureAspectRatio;
      previewHeight = minPreviewHeight;
    } else {
      previewWidth = minPreviewWidth;
      previewHeight = previewWidth / pictureAspectRatio;
    }

    // The last step here is to apply CSS transform, rotating camera preview
    // into direction of screen. And we set left and top here to let center of
    // viewfinder coincide with center of the screen, thus preventing unwanted
    // displacement introduced by rotation.
    var transform = '';
    if (this._cameraNumber == 1) {
      // Front-facing (selfie) camera: The preview needs to be mirrored.
      // before mirroring, it needs to be rotated by sensorAngle in clockwise,
      // but after mirroring it needs to be rotated by sensorAngle in
      // *counter-clockwise*, which is just the case here if we add scale()
      // before rotate().
      transform += 'scale(-1, 1) ';
    }
    transform += 'rotate(' + camera.sensorAngle + 'deg)';
    style.transform = transform;

    style.left =
      ((screenWidth - previewWidth) / 2 / window.devicePixelRatio) + 'px';
    style.top =
      ((screenHeight - previewHeight) / 2 / window.devicePixelRatio) + 'px';
    style.width = previewWidth / window.devicePixelRatio + 'px';
    style.height = previewHeight / window.devicePixelRatio + 'px';
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
    if (flashModes) {
      // Check camera flash support
      var flash = this._flashState[this.CAMERA];
      flash.supported[this._cameraNumber] = isSubset(flash.modes, flashModes);

      // Check video flash support
      flash = this._flashState[this.VIDEO];
      flash.supported[this._cameraNumber] = isSubset(flash.modes, flashModes);

      this.updateFlashUI();
    } else {
      this.toggleFlashBtn.classList.add('hidden');
    }

    var focusModes = capabilities.focusModes;
    if (focusModes) {
      var support = this._autoFocusSupport;
      support[FOCUS_MODE_MANUALLY_TRIGGERED] =
        focusModes.indexOf(FOCUS_MODE_MANUALLY_TRIGGERED) !== -1;
      support[FOCUS_MODE_CONTINUOUS_CAMERA] =
        focusModes.indexOf(FOCUS_MODE_CONTINUOUS_CAMERA) !== -1;
      support[FOCUS_MODE_CONTINUOUS_VIDEO] =
        focusModes.indexOf(FOCUS_MODE_CONTINUOUS_VIDEO) !== -1;
    }
  },

  startPreview: function camera_startPreview() {
    this.requestScreenWakeLock();
    this.viewfinder.play();
    this.loadCameraPreview(this._cameraNumber, this.previewEnabled.bind(this));
    this._previewActive = true;
  },

  previewEnabled: function() {
    this.enableButtons();
    if (!this._pendingPick) {
      setTimeout(this.initPositionUpdate.bind(this), this.PROMPT_DELAY);
    }
  },

  stopPreview: function camera_stopPreview() {
    try {
      this.releaseScreenWakeLock();
      if (this._recording) {
        this.stopRecording();
      }
      this.hideFocusRing();
      this.disableButtons();
      this.viewfinder.pause();
      this._previewActive = false;
      this.viewfinder.mozSrcObject = null;
    } catch (ex) {
      console.error('error while stopping preview', ex.message);
    } finally {
      this.release();
    }
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
      if (!this._pendingPick) {
        Filmstrip.addImage(absolutePath, blob);
        Filmstrip.show(Camera.FILMSTRIP_DURATION);
      }
      this.checkStorageSpace();
    }.bind(this));
  },

  retakePressed: function camera_retakePressed() {
    this._savedMedia = null;
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
    if (this._captureMode === this.CAMERA) {
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
      if (Filmstrip.isPreviewShown()) {
        // If media frame is shown and storage is unavailable or shared, it may
        // be a video or a picture is opened. We should go back to camera mode
        // to prevent file deleted or file lock. If the video is playing, camera
        // app will be killed becase of mounting as sdcard and file is locked.
        Filmstrip.hidePreview();
      }
      break;
    case 'shared':
      this._storageState = this.STORAGE_UNMOUNTED;
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
    if (this._storageState === this.STORAGE_INIT) {
      return false;
    }

    if (this._storageState === this.STORAGE_AVAILABLE) {
      // Preview may have previously been paused if storage
      // was not available
      // Don't start the preview when confirm dialog is showing. The choices of
      // ConfirmDialog call the startPreview or close this activity.
      if (!this._previewActive && !document.hidden &&
          !ConfirmDialog.isShowing()) {
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
      this.showOverlay('nospace');
      break;
    }
    if (this._previewActive) {
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

  // If the user rotates the phone by 90 degrees clockwise, then the camera on
  // the back of the phone has been rotated by 90 degrees clockwise. But the
  // camera on the front of the phone (the selfie camera) has been rotated by 90
  // degrees counter clockwise. This function computes the camera orientation
  // based on the phone orientation and which camera is being used. Using the
  // correct orientation matters so that the camera firmware can encode the
  // photo right-side up.
  getCameraOrientation: function camera_getCameraOrientation() {
    if (this._cameraNumber == 0) {
      // Back camera
      return this._phoneOrientation;
    } else {
      // Front (selfie) camera
      return -this._phoneOrientation;
    }
  },

  takePicture: function camera_takePicture() {
    this._config.rotation = this.getCameraOrientation();
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

    if (this._pendingPick) {
      this.overlayMenuClose.classList.remove('hidden');
    } else {
      this.overlayMenuClose.classList.add('hidden');
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

    // CONFIG_MAX_IMAGE_PIXEL_SIZE is
    // maximum image resolution for images
    // displayed by the Gallery app.
    //
    // CONFIG_MAX_SNAPSHOT_PIXEL_SIZE is
    // maximum image resolution for snapshots
    // taken with camera.
    //
    // We use the smaller of the two max values
    // above so we can display captured images
    // in the gallery.
    //
    // They come from config.js which is generated in build time,
    // 5 megapixels by default (see build/application-data.js).
    var maxRes = Math.min(CONFIG_MAX_IMAGE_PIXEL_SIZE,
      CONFIG_MAX_SNAPSHOT_PIXEL_SIZE);
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
  Camera.viewfinder.mozSrcObject = null;
});
