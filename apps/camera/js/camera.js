'use strict';

var Camera = {

  _camera: 0,
  _captureMode: null,
  // In secure mode the user cannot browse to the gallery
  _secureMode: window.parent !== window,
  _currentOverlay: null,

  CAMERA: 'camera',
  VIDEO: 'video',

  _videoCapturing: false,
  _videoTimer: null,
  _videoStart: null,

  _autoFocusSupported: 0,
  _manuallyFocused: false,

  _timeoutId: 0,
  _cameraObj: null,

  _photosTaken: [],
  _effect: 0,
  _cameraProfile: null,

  _filmStripShown: false,
  _filmStripTimer: null,

  _styleSheet: document.styleSheets[0],
  _orientationRule: null,
  _phoneOrientation: 0,

  _storage: navigator.getDeviceStorage('pictures'),
  _pictureSize: null,
  _previewActive: false,

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

  init: function camera_init() {

    this.setCaptureMode(this.CAMERA);

    // We lock the screen orientation and deal with rotating
    // the icons manually
    var css = '#switch-button span, #capture-button span, ' +
      '#gallery-button span { -moz-transform: rotate(0deg); }';
    var insertId = this._styleSheet.cssRules.length - 1;
    this._orientationRule = this._styleSheet.insertRule(css, insertId);
    window.addEventListener('deviceorientation', this.orientChange.bind(this));

    this.viewfinder.addEventListener('click', this.autoFocus.bind(this));
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

    this.setSource(this._camera);
  },

  toggleModePressed: function camera_toggleCaptureMode(e) {
    if (e.target.getAttribute('disabled')) {
      return;
    }

    var newMode = (this.captureMode === this.CAMERA) ? this.VIDEO : this.CAMERA;
    this.setCaptureMode(newMode);
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

  autoFocus: function camera_autoFocus(ev) {
    if (!this._autoFocusSupported) {
      return;
    }

    this.focusRing.setAttribute('data-state', 'focusing');
    this._cameraObj.autoFocus(function onAutofocus(success) {
      this._manuallyFocused = success;
      this.focusRing.setAttribute('data-state', success ? 'focused' : 'fail');
      window.setTimeout(this.hideFocusRing.bind(this), 1000);
    }.bind(this));
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

    var cameras = navigator.mozCameras.getListOfCameras();
    var options = {camera: cameras[this._camera]};

    function gotPreviewScreen(stream) {
      this._previewActive = true;
      viewfinder.src = stream;
      viewfinder.play();
    }

    function gotCamera(camera) {
      this._cameraObj = camera;
      this._config.rotation = rotation;
      this._autoFocusSupported =
        camera.capabilities.focusModes.indexOf('auto') !== -1;
      this._pictureSize =
        this._largestPictureSize(camera.capabilities.pictureSizes);
      camera.effect = camera.capabilities.effects[this._effect];
      var config = {
        height: height,
        width: width
      };
      camera.getPreviewStream(config, gotPreviewScreen.bind(this));
      this.checkStorageSpace();
    }
    navigator.mozCameras.getCamera(options, gotCamera.bind(this));
  },

  pause: function pause() {
    this.viewfinder.pause();
    this.viewfinder.src = null;
    this._previewActive = false;
  },

  resume: function camera_resume() {
    /*
      Stream lifetime management doesn't seem to be
      working propertly, so just stomp on everything
      and start completely fresh.

    this._cameraObj.getPreviewStream(null, function(stream) {
      this.viewfinder.src = stream;
    }.bind(this));
    */
    this.setSource(this._camera); /* STOMP */
  },

  showFilmStrip: function camera_showFilmStrip() {
    var strip = this.filmStrip;
    strip.innerHTML = '';

    this._photosTaken.forEach(function(imageBlob) {
      var preview = document.createElement('img');
      preview.src = window.URL.createObjectURL(imageBlob);
      strip.appendChild(preview);
    });

    strip.style.top = '0px';
    this._filmStripShown = true;
  },

  hideFilmStrip: function camera_hideFilmStrip() {
    this.filmStrip.style.top = '-50px';
    this._filmStripShown = false;
  },

  restartPreview: function camera_restartPreview() {
    this.resume();
    this.captureButton.removeAttribute('disabled');
    this._filmStripTimer =
      window.setTimeout(this.hideFilmStrip.bind(this), 5000);
  },

  takePictureSuccess: function camera_takePictureSuccess(blob) {
    var self = this;
    this._manuallyFocused = false;
    this._photosTaken.unshift(blob);
    this.showFilmStrip();
    this.hideFocusRing();
    this.restartPreview();

    var rightnow = new Date();
    var filename = 'img_' + rightnow.toLocaleFormat('%Y%m%d-%H%M%S') + '.jpg';

    var addreq = this._storage.addNamed(blob, filename);
    addreq.onsuccess = function() {
      console.log("image saved as '" + filename + "'");
      self.checkStorageSpace();
    };

    addreq.onerror = function() {
      console.log("failed to save image as '" + filename + "':" +
                  JSON.stringify(addreq.error));
    };
  },

  hideFocusRing: function camera_hideFocusRing() {
    this.focusRing.removeAttribute('data-state');
  },

  checkStorageSpace: function camera_checkStorageSpace() {
    var MAX_IMAGE_SIZE = this._pictureSize.width * this._pictureSize.height
      * 4 + 4096;
    this._storage.stat().onsuccess = (function(e) {
      if (e.target.result.freeBytes > MAX_IMAGE_SIZE) {
        this.showOverlay(null);
        if (!this._previewActive) {
          this.resume();
        }
      } else {
        this.showOverlay('nospace');
        if (this._previewActive) {
          this.pause();
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

    this._config.rotation = this.layoutToPhoneOrientation(this._phoneOrientation);
    this.focusRing.setAttribute('data-state', 'focused');
    this._cameraObj
      .takePicture(this._config, this.takePictureSuccess.bind(this));
  },

  takePicture: function camera_takePicture() {
    this.captureButton.setAttribute('disabled', 'disabled');
    this.focusRing.setAttribute('data-state', 'focusing');
    if (this._autoFocusSupported && !this._manuallyFocused) {
      this._cameraObj.autoFocus(this.takePictureAutoFocusDone.bind(this));
    } else {
      this._config.rotation = this.layoutToPhoneOrientation(this._phoneOrientation);
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
    Camera.pause();
  } else {
    Camera.resume();
  }
});

window.addEventListener('beforeunload', function() {
  window.clearTimeout(Camera._timeoutId);
  delete Camera._timeoutId;
  Camera.viewfinder.src = null;
});
