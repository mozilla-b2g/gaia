var Camera = {
  _filter: '',
  _camera: 0,

  get video() {
    return document.getElementById('video');
  },

  init: function cameraInit() {
    var width, height;
    if (window.innerWidth > window.innerHeight) {
      width = window.innerWidth;
      height = window.innerHeight;
    } else {
      width = window.innerHeight;
      height = window.innerWidth;

      var deltaX = (width - height) / 2;
      var transform = 'rotate(90deg)';
      if (this._camera == 1)
        transform += ' scale(-1, 1)';

      var container = document.getElementById('video-container');
      container.style.MozTransform = transform;
    }

    var config = {
      width: width,
      height: height,
      camera: this._camera
    }

    var video = this.video;
    video.style.width = width + 'px';
    video.style.height = height + 'px';
    video.style.filter = this._filter;

    video.src = navigator.mozCamera.getCameraURI(config);
  },

  pause: function pause() {
    this.video.pause();
  },

  toggleCamera: function toggleCamera() {
    this._camera = 1 - this._camera;
    this.video.src = '';
    this.init();
  },

  toggleFilter: function toggleFilter(target) {
    var filter = '';

    if (!target.classList.contains('selected')) {
      var childs = target.parentNode.childNodes;
      for (var i = 0; i < childs.length; i++) {
        var child = childs[i];
        if (child.classList)
          child.classList.remove('selected');
      }

      filter = 'url(#' + target.dataset.filter + ')';
    }

    this._filter = this.video.style.filter = filter;
    target.classList.toggle('selected');
  }
};

window.addEventListener('DOMContentLoaded', function CameraInit() {
  Camera.init();
});

// Bug 690056 implement a visibility API, and it's likely that
// we want this event to be fire when an app come back to life
// or is minimized (it does not now).
window.addEventListener('message', function CameraPause(evt) {
  if (evt.data.hidden) {
    Camera.pause();
  } else {
    Camera.init();
  }
});
