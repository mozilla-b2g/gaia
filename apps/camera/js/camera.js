'use strict';

var Camera = {

  _cameras: null,
  _camera: 0,
  _captureMode: null,
  // In secure mode the user cannot browse to the gallery
  _secureMode: window.parent !== window,
  _storageChecked: false,
  _currentOverlay: null,

  CAMERA: 'camera',
  VIDEO: 'video',

  THUMBNAIL_LIMIT: 4,

  _videoCapturing: false,
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
  _pictureSize: null,
  _previewActive: false,

  _flashModes: [],
  _currentFlashMode: 0,

  _config: {
    fileFormat: 'jpeg',
    position: {
      latitude: 43.468005,
      longitude: -80.523399
    }
  },

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

    this.setCaptureMode(this.CAMERA);

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
    // TODO: Remove once support is available
    this.switchButton.setAttribute('disabled', 'disabled');

    if (!navigator.mozCameras) {
      this.captureButton.setAttribute('disabled', 'disabled');
      return;
    }

    if (this._secureMode) {
      this.galleryButton.setAttribute('disabled', 'disabled');
    }

    this.setToggleCameraStyle();
    this.setSource(this._camera);
  },

  toggleModePressed: function camera_toggleCaptureMode(e) {
    if (e.target.getAttribute('disabled')) {
      return;
    }

    var newMode = (this.captureMode === this.CAMERA) ? this.VIDEO : this.CAMERA;
    this.setCaptureMode(newMode);
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

  capturePressed: function camera_doCapture(e) {
    if (e.target.getAttribute('disabled')) {
      return;
    }

    if (this.captureMode === this.CAMERA) {
      this.takePicture();
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
    // Launch the gallery with an open activity to view this specific photo
    var filename = e.target.getAttribute('data-filename');
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
    };

    a.onerror = function(e) {
      reopen();
      console.warn('open activity error:', a.error.name);
    };
    a.onsuccess = function(e) {
      reopen();

      if (a.result.delete) {
        // XXX: the user asked to delete this photo, so
        // delete it from device storage and remove from the filmstrip
        console.warn('delete feature is not yet implemented');
      }
    };
  },

  setSource: function camera_setSource(camera) {

    this.viewfinder.src = null;
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
      viewfinder.src = stream;
      viewfinder.play();
      this.checkStorageSpace();
    }

    function gotCamera(camera) {
      this._cameraObj = camera;
      this._config.rotation = rotation;
      this._autoFocusSupported =
        camera.capabilities.focusModes.indexOf('auto') !== -1;
      this._pictureSize =
        this._largestPictureSize(camera.capabilities.pictureSizes);
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
  },

  stop: function camera_stop() {
    this.pause();
    this.viewfinder.src = null;
  },

  pause: function camera_pause() {
    this.viewfinder.pause();
    this._previewActive = false;
  },

  // resumePreview is upcoming in gecko, avoiding version skew
  // by doing a clobber on builds without resumePreview.
  // TODO: remove once resumePreview has landed:
  //  * https://bugzilla.mozilla.org/show_bug.cgi?id=779139#c21
  resume: function camera_resume() {
    if ('resumePreview' in this._cameraObj) {
      this._cameraObj.resumePreview();
    } else {
      this.start();
    }
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
      }
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
    var MAX_IMAGE_SIZE = this._pictureSize.width * this._pictureSize.height *
      4 + 4096;
    this._storage.stat().onsuccess = (function(e) {
      if (e.target.result.freeBytes > MAX_IMAGE_SIZE) {
        this.showOverlay(null);
        if (!this._previewActive) {
          this.stop();
        }
      } else {
        this.showOverlay('nospace');
        if (this._previewActive) {
          this.start();
        }
      }
    }).bind(this);
  },

  takePictureAutoFocusDone: function camera_takePictureAutoFocusDone(success) {
    if (!success) {
      this.focusRing.setAttribute('data-state', 'fail');
      this.captureButton.removeAttribute('disabled');
      window.setTimeout(this.hideFocusRing.bind(this), 1000);
      return;
    }

    this.focusRing.setAttribute('data-state', 'focused');
    this._config.rotation =
      this.layoutToPhoneOrientation(this._phoneOrientation);
    this._cameraObj
      .takePicture(this._config, this.takePictureSuccess.bind(this));
  },

  takePicture: function camera_takePicture() {
    this.captureButton.setAttribute('disabled', 'disabled');
    this.focusRing.setAttribute('data-state', 'focusing');
    if (this._autoFocusSupported && !this._manuallyFocused) {
      this._cameraObj.autoFocus(this.takePictureAutoFocusDone.bind(this));
    } else {
      this._config.rotation =
        this.layoutToPhoneOrientation(this._phoneOrientation);
      this._cameraObj
        .takePicture(this._config, this.takePictureSuccess.bind(this));
    }
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

  _largestPictureSize: function camera_largestPictureSize(pictureSizes) {
    return pictureSizes.reduce(function(acc, size) {
      if (size.width + size.height > acc.width + acc.height) {
        return size;
      } else {
        return acc;
      }
    });
  }
};

window.addEventListener('DOMContentLoaded', function CameraInit() {
  Camera.init();
});

document.addEventListener('mozvisibilitychange', function() {
  if (document.mozHidden) {
    Camera.stop();
  } else {
    Camera.start();
  }
});

window.addEventListener('beforeunload', function() {
  window.clearTimeout(Camera._timeoutId);
  delete Camera._timeoutId;
  Camera.viewfinder.src = null;
});
