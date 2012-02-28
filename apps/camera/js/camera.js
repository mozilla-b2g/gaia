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

  get galleryButton() {
    return document.getElementById('gallery-button');
  },

  init: function cameraInit() {
    this.switchButton.addEventListener('click', this.toggleCamera.bind(this));
    this.galleryButton.addEventListener('click', function() {
      // This is bad. It should eventually become a hyperlink or Web Intent.
      window.parent.WindowManager.launch('../gallery/gallery.html');
    });

    var width, height;
    var viewfinder = this.viewfinder;

    width = document.body.clientHeight;
    height = document.body.clientWidth;
      
    var top = ((width/2) - ((height)/2));
    var left = -((width/2) - (height/2));
    viewfinder.style.top = top + 'px';
    viewfinder.style.left = left + 'px';

    var transform = 'rotate(90deg)';
    if (this._camera == 1)
      transform += ' scale(-1, 1)';

    viewfinder.style.MozTransform = transform;

    var config = {
      height: height,
      width: width,
      camera: this._camera
    }

    viewfinder.style.width = width + 'px';
    viewfinder.style.height = height + 'px';
    if(navigator.mozCamera)
      viewfinder.src = navigator.mozCamera.getCameraURI(config);
  },

  pause: function pause() {
    this.viewfinder.pause();
  },

  toggleCamera: function toggleCamera() {
    this._camera = 1 - this._camera;
    this.viewfinder.src = '';
    this.init();
  },

};

window.addEventListener('DOMContentLoaded', function CameraInit() {
  Camera.init();
});

// Bug 690056 implement a visibility API, and it's likely that
// we want this event to be fire when an app come back to life
// or is minimized (it does not now).
window.addEventListener('message', function CameraPause(evt) {
  if (evt.data.message !== 'visibilitychange')
    return;

  if (evt.data.hidden) {
    Camera.pause();
  } else {
    Camera.init();
  }
});
