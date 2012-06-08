'use strict';

var Camera = {
  _camera: 0,

  get viewfinder() {
    return document.getElementById('viewfinder');
  },

  get switchButton() {
    return document.getElementById('switch-button');
  },

  get captureButton() {
    return document.getElementById('capture-button');
  },

  init: function cameraInit() {
    this.switchButton.addEventListener('click', this.toggleCamera.bind(this));

    this.setSource(this._camera);
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

  toggleCamera: function toggleCamera() {
    this._camera = 1 - this._camera;
    this.setSource(this._camera);
  }

};

window.addEventListener('DOMContentLoaded', function CameraInit() {
  Camera.init();
});
