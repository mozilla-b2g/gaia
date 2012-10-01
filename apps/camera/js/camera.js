'use strict';

var Camera = {

  _started: false,

  _cameras: null,
  _camera: 0,
  _captureMode: null,

  // In secure mode the user cannot browse to the gallery
  _secureMode: window.parent !== window,
  _currentOverlay: null,

  CAMERA: 'camera',
  VIDEO: 'video',

  THUMBNAIL_LIMIT: 4,

  _videoTimer: null,
  _videoStart: null,

  _autoFocusSupported: 0,
  _manuallyFocused: false,

  _timeoutId: 0,
  _cameraObj: null,

  _photosTaken: [],
  _cameraProfile: null,

  _filmStripShown: false,
  _filmStripTimer: null,
  _resumeViewfinderTimer: null,

  _styleSheet: document.styleSheets[0],
  _orientationRule: null,
  _phoneOrientation: 0,

  _storage: navigator.getDeviceStorage('pictures'),
  _storageState: null,

  STORAGE_INIT: 0,
  STORAGE_AVAILABLE: 1,
  STORAGE_NOCARD: 2,
  STORAGE_UNMOUNTED: 3,
  STORAGE_CAPACITY: 4,

  _pictureSize: null,
  _previewPaused: false,
  _previewActive: false,

  _flashModes: [],
  _currentFlashMode: 0,

  _config: {
    fileFormat: 'jpeg'
  },
  _videoConfig: {
    rotation: 90,
    width: 352,
    height: 288
  },

  _shutterSound: new Audio('./resources/sounds/shutter.ogg'),

  // Because we dont want to wait for the geolocation query
  // before we can take a photo, we keep a track of the users
  // position, when the camera jumps into foreground or every
  // 10 minutes
  POSITION_TIMEOUT: 1000 * 60 * 10,
  _positionTimer: null,
  _position: null,

  _pendingPick: null,

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

    this._storage
      .addEventListener('change', this.deviceStorageChangeHandler.bind(this));

    this.setToggleCameraStyle();
    this.setSource(this._camera);

    this._started = true;

    if (this._pendingPick) {
      this.initActivity();
    }
  },

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
    this.setCaptureMode(newMode);

    function gotPreviewStream(stream) {
      this.viewfinder.mozSrcObject = stream;
      this.viewfinder.play();
    }
    if (this.captureMode === this.CAMERA) {
      // TODO: fix this so we can just call getPreviewStream(), or toggle a mode, or something
      this.setSource(this._camera); // STOMP
    } else {
      this._cameraObj.getPreviewStreamVideoMode(this._videoConfig, gotPreviewStream.bind(this));
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
    var captureButton = this.captureButton;

    if (!document.body.classList.contains('capturing')) {
      captureButton.setAttribute('disabled', 'disabled');
      document.body.classList.add('capturing');
      this._cameraObj.startRecording(
        navigator.getDeviceStorage('videos'),
        "VID_0001.3gp",
        function onsuccess() {
          captureButton.removeAttribute('disabled');
        },
        function onerror() {
          captureButton.removeAttribute('disabled');
          document.body.classList.remove('capturing');
        }
      );
    } else {
      this._cameraObj.stopRecording();
      document.body.classList.remove('capturing');
    }
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
    var orientation = (e.beta > 45) ? 180 :
      (e.beta < -45) ? 0 :
      (e.gamma < -45) ? 270 :
      (e.gamma > 45) ? 90 : 0;

    if (orientation !== this._phoneOrientation) {
      var rule = this._styleSheet.cssRules[this._orientationRule];
      // PLEASE DO SOMETHING KITTENS ARE DYING
      // Setting MozRotate to 90 or 270 causes element to disappear
      rule.style.MozTransform = 'rotate(' + (orientation + 1) + 'deg)';
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
    if (this._secureMode) {
      return;
    }

    // Launch the gallery with an open activity to view this specific photo
    var filename = e.target.getAttribute('data-filename');
    var storage = this._storage;

    var a = new MozActivity({
      name: 'open',
      data: {
        type: 'image/jpeg',
        filename: filename
      }
    });

    // XXX: this seems like it should not be necessary
    function reopen() {
      navigator.mozApps.getSelf().onsuccess = function getSelfCB(evt) {
        evt.target.result.launch();
      };
    }

    a.onerror = function(e) {
      reopen();
      console.warn('open activity error:', a.error.name);
    };
    a.onsuccess = function(e) {
      reopen();

      if (a.result.delete) {
        storage.delete(filename).onerror = function(e) {
          console.error('Failed to delete', filename,
                        'from DeviceStorage:', e.target.error);
        };
      }
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
      rotation = 270;
    } else {
      /* forwards-facing camera */
      rotation = 90;
    }

    style.MozTransform = transform;
    style.width = width + 'px';
    style.height = height + 'px';

    this._cameras = navigator.mozCameras.getListOfCameras();
    var options = {camera: this._cameras[this._camera]};

    function gotPreviewScreen(stream) {
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
        this.largestPictureSize(camera.capabilities.pictureSizes);
      var config = {
        height: height,
        width: width
      };
      this.enableCameraFeatures(camera.capabilities);
      camera.getPreviewStream(config, gotPreviewScreen.bind(this));
    }
    navigator.mozCameras.getCamera(options, gotCamera.bind(this));
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

  start: function camera_start() {
    this.viewfinder.play();
    this.setSource(this._camera);
    this._previewActive = true;
    this.initPositionUpdate();
  },

  stop: function camera_stop() {
    this.pause();
    this.viewfinder.mozSrcObject = null;
    this.cancelPositionUpdate();
  },

  pause: function camera_pause() {
    this.viewfinder.pause();
    this._previewActive = false;
  },

  resume: function camera_resume() {
    this._cameraObj.resumePreview();
    this._previewActive = true;
  },

  showFilmStrip: function camera_showFilmStrip() {
    var strip = this.filmStrip;
    strip.innerHTML = '';
    var self = this;

    this._photosTaken.forEach(function(image) {
      var preview = document.createElement('img');
      preview.src = window.URL.createObjectURL(image.blob);
      preview.setAttribute('data-filename', image.name);
      preview.onclick = self.filmStripPressed.bind(self);
      preview.onload = function() {
        window.URL.revokeObjectURL(this.src);
      };
      strip.appendChild(preview);
    });
    strip.classList.remove('hidden');
    this._filmStripShown = true;
  },

  hideFilmStrip: function camera_hideFilmStrip() {
    this.filmStrip.classList.add('hidden');
    this._filmStripShown = false;
  },

  restartPreview: function camera_restartPreview() {
    this.captureButton.removeAttribute('disabled');
    this._filmStripTimer =
      window.setTimeout(this.hideFilmStrip.bind(this), 5000);
    this._resumeViewfinderTimer =
      window.setTimeout(this.resume.bind(this), 2000);
  },

  takePictureSuccess: function camera_takePictureSuccess(blob) {
    this._manuallyFocused = false;
    this.hideFocusRing();
    this.restartPreview();

    var f = new navigator.mozL10n.DateTimeFormat();
    var rightnow = new Date();
    var name = 'DCIM/img_' + f.localeFormat(rightnow, '%Y%m%d-%H%M%S') + '.jpg';
    var addreq = this._storage.addNamed(blob, name);

    addreq.onsuccess = (function() {

      if (this._pendingPick) {
        this._pendingPick.postResult({
          type: 'image/jpeg',
          filename: name
        });
        this.cancelActivity();
        return;
      }

      this._photosTaken.push({name: name, blob: blob});
      if (this._photosTaken.length > this.THUMBNAIL_LIMIT) {
        this._photosTaken.shift();
      }
      this.checkStorageSpace();
      this.showFilmStrip();
    }).bind(this);

    addreq.onerror = (function() {
      this.showOverlay('error-saving');
    }).bind(this);
  },

  hideFocusRing: function camera_hideFocusRing() {
    this.focusRing.removeAttribute('data-state');
  },

  checkStorageSpace: function camera_checkStorageSpace() {
    if (this.showDialog()) {
      return;
    }
    var MAX_IMAGE_SIZE = this._pictureSize.width * this._pictureSize.height *
      4 + 4096;
    this._storage.stat().onsuccess = (function(e) {
      var stats = e.target.result;

      // If we have not yet checked the state of the storage, do so
      if (this._storageState === this.STORAGE_INIT) {
        this.updateStorageState(stats.state);
        this.showDialog();
      }

      if (this._storageState !== this.STORAGE_AVAILABLE) {
        return;
      }
      if (stats.freeBytes < MAX_IMAGE_SIZE) {
        this._storageState = this.STORAGE_CAPACITY;
      }
      this.showDialog();

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

  showDialog: function camera_showDialog() {
    if (this._storageState === this.STORAGE_INIT) {
      return false;
    }

    if (this._storageState === this.STORAGE_AVAILABLE) {
      // Preview may have previously been paused if storage
      // was not available
      if (!this._previewActive && !document.mozHidden) {
        this.start();
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
      this.stop();
    }
    return true;
  },

  prepareTakePicture: function camera_takePicture() {
    this.captureButton.setAttribute('disabled', 'disabled');
    this.focusRing.setAttribute('data-state', 'focusing');
    if (this._autoFocusSupported && !this._manuallyFocused) {
      this._cameraObj.autoFocus(this.autoFocusDone.bind(this));
    } else {
      this.takePicture();
    }
  },

  autoFocusDone: function camera_autoFocusDone(success) {
    if (!success) {
      this.focusRing.setAttribute('data-state', 'fail');
      this.captureButton.removeAttribute('disabled');
      window.setTimeout(this.hideFocusRing.bind(this), 1000);
      return;
    }
    this.focusRing.setAttribute('data-state', 'focused');
    this.takePicture();
  },

  takePicture: function camera_takePicture() {
    this._config.rotation =
      this.layoutToPhoneOrientation(this._phoneOrientation);
    if (this._position) {
      this._config.position = this._position;
    }
    this._shutterSound.play();
    this._cameraObj
      .takePicture(this._config, this.takePictureSuccess.bind(this));
  },

  // The layout (icons) and the phone calculate orientation in the
  // opposite direction
  layoutToPhoneOrientation: function camera_layoutToPhoneOrientation() {
    return 270 - this._phoneOrientation;
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

  largestPictureSize: function camera_largestPictureSize(pictureSizes) {
    return pictureSizes.reduce(function(acc, size) {
      if (size.width + size.height > acc.width + acc.height) {
        return size;
      } else {
        return acc;
      }
    });
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
    Camera.stop();
    Camera.cancelActivity(true);
  } else {
    Camera.start();
  }
});

window.addEventListener('beforeunload', function() {
  window.clearTimeout(Camera._timeoutId);
  delete Camera._timeoutId;
  Camera.viewfinder.mozSrcObject = null;
});
