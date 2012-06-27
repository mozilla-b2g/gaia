'use strict';

var Camera = {

  CAMERA: 'camera',
  VIDEO: 'video',

  _camera: null,
  _videoCapturing: false,

  _videoTimer: null,
  _videoStart: null,

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

  init: function cameraInit() {

    this.switchButton.addEventListener('click', this.toggleCamera.bind(this));
    this.captureButton.addEventListener('click', this.doCapture.bind(this));

    this.galleryButton.addEventListener('click', function() {
      // TODO: implement once we have webActivities
    });

    this._camera = this.CAMERA;
    this.setSource(this._camera);
  },

  doCapture: function camera_doCapture() {
    if (this._camera !== this.VIDEO)
      return;

    if (!this._videoCapturing) {
      this._videoCapturing = true;
      document.body.classList.add('capturing');
      this.switchButton.setAttribute('disabled', 'disabled');
      this.galleryButton.setAttribute('disabled', 'disabled');
      this.videoTimer.innerHTML = '00:00';
      this._videoStart = new Date();
      this._videoTimer = setInterval(this.updateVideoTimer.bind(this), 900);
    } else {
      this._videoCapturing = false;
      document.body.classList.remove('capturing');
      this.switchButton.removeAttribute('disabled');
      this.galleryButton.removeAttribute('disabled');
      this._videoTimer = clearInterval(this._videoTimer);
    }
  },

  padZero: function camera_padZero(number, length) {
    var str = '' + number;
    while (str.length < length) {
      str = '0' + str;
    }
    return str;
  },

  updateVideoTimer: function camera_updateVideoTimer() {
    var diffSec = (new Date() - this._videoStart) / 1000;
    var min = Math.floor(diffSec / 60);
    var sec = Math.round((diffSec - (min * 60)));
    this.videoTimer.innerHTML = this.padZero(min, 2) + ':' + this.padZero(sec, 2);
  },

  setSource: function camera_setSource(camera) {
    this.viewfinder.src = '';

    var width, height;
    var viewfinder = this.viewfinder;

    width = document.body.clientHeight;
    height = document.body.clientWidth;

    var top = ((width / 2) - ((height) / 2));
    var left = -((width / 2) - (height / 2));
    viewfinder.style.top = top + 'px';
    viewfinder.style.left = left + 'px';

    var transform = 'rotate(90deg)';
    if (this._camera == 1)
      transform += ' scale(-1, 1)';

    viewfinder.style.MozTransform = transform;

    var config = {
      height: height,
      width: width,
      camera: camera
    };

    viewfinder.style.width = width + 'px';
    viewfinder.style.height = height + 'px';
    if (navigator.mozCamera)
      viewfinder.src = navigator.mozCamera.getCameraURI(config);
  },

  pause: function pause() {
    this.viewfinder.pause();
  },

  resume: function resume() {
    this.viewfinder.play();
  },

  toggleCamera: function toggleCamera(e) {
    if (e.target.getAttribute('disabled')) {
      return;
    }
    document.body.classList.remove(this._camera);
    this._camera = (this._camera === this.CAMERA) ? this.VIDEO : this.CAMERA;
    this.setSource(this._camera === this.CAMERA ? 0 : 1);
    document.body.classList.add(this._camera);
  }

};

window.addEventListener('DOMContentLoaded', function CameraInit() {
  Camera.init();
});

document.addEventListener('mozvisibilitychange', function visibility(e) {
  if (document.mozHidden) {
    // If we're hidden, stop the video
    Camera.pause();
  } else {
    // If we become visible again, first reconfigure the camera
    // in case the screen has rotated or something, and then
    // resume the video.
    Camera.setSource(Camera._camera);
    Camera.resume();
  }
});
