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
      window.parent.WindowManager.launch('http://gallery.gaiamobile.org/');
    });

    // Monitor the class attribute of our containing iframe and turn 
    // the camera off if we're not the active app anymore.  Turn it back
    // on when we become active again. Note that the camera is defined
    // with the autoplay attribute so we don't have to call play when
    // we first start up.
    window.frameElement.addEventListener('DOMAttrModified', function(e) {
      if (e.attrName !== 'class') return;
      if (window.frameElement.classList.contains('active'))
        Camera.play();
      else 
        Camera.pause();
    });

    this.setSource(this._camera);
  },

  setSource: function camera_setSource(camera) {
    this.viewfinder.src = '';

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
      camera: camera
    }

    viewfinder.style.width = width + 'px';
    viewfinder.style.height = height + 'px';
    if(navigator.mozCamera)
      viewfinder.src = navigator.mozCamera.getCameraURI(config);
  },

  pause: function pause() {
    this.viewfinder.pause();
  },

  play: function play() {
    this.viewfinder.play();
  },

  toggleCamera: function toggleCamera() {
    this._camera = 1 - this._camera;
    this.setSource(this._camera);
  },

};

window.addEventListener('DOMContentLoaded', function CameraInit() {
  Camera.init();
});

