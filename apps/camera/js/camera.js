'use strict';

var Camera = {

  _camera: 0,
  _captureMode: null,

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

  _config: {
    fileFormat: 'jpeg',
    rotation: 90,
    position: {
      latitude: 43.468005,
      longitude: -80.523399
    }
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
    if (this._filmStripTimer) {
      window.clearTimeout(this._filmStripTimer);
    }

    !this._filmStripShown ? this.showFilmStrip() : this.hideFilmStrip();
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
      viewfinder.src = stream;
      viewfinder.play();
    }

    function gotCamera(camera) {
      this._cameraObj = camera;
      this._config._rotation = rotation;
      this._autoFocusSupported =
        camera.capabilities.focusModes.indexOf('auto') !== -1;
      camera.effect = camera.capabilities.effects[this._effect];
      var config = {
        height: height,
        width: width
      };
      camera.getPreviewStream(config, gotPreviewScreen.bind(this));
    }
    navigator.mozCameras.getCamera(options, gotCamera.bind(this));
  },

  pause: function pause() {
    this.viewfinder.pause();
    this.viewfinder.src = null;
  },

  resume: function camera_resume() {
    this.viewfinder.play();
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
    this._manuallyFocused = false;

    if (!navigator.getDeviceStorage) {
      console.log('Device storage unavailable');
      return;
    }

    this._photosTaken.unshift(blob);
    this.showFilmStrip();
    this.hideFocusRing();
    this.restartPreview();

    var storageAreas = navigator.getDeviceStorage('pictures');
    var storage = storageAreas[0];
    var rightnow = new Date();
    var filename = 'img_' + rightnow.toLocaleFormat('%Y%m%d-%H%M%S') + '.jpg';

    var addreq = storage.addNamed(blob, filename);
    addreq.onsuccess = function() {
      console.log("image saved as '" + filename + "'");
    };

    addreq.onerror = function() {
      console.log("failed to save image as '" + filename + "':" +
                  JSON.stringify(addreq.error));
    };
  },

  hideFocusRing: function camera_hideFocusRing() {
    this.focusRing.removeAttribute('data-state');
  },

  takePictureAutoFocusDone: function camera_takePictureAutoFocusDone(success) {
    if (!success) {
      this.focusRing.setAttribute('data-state', 'fail');
      this.captureButton.removeAttribute('disabled');
      window.setTimeout(this.hideFocusRing.bind(this), 1000);
      return;
    }

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
      this._cameraObj
        .takePicture(this._config, this.takePictureSuccess.bind(this));
    }
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

