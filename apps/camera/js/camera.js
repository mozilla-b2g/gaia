var Camera = {
  _filter: '',
  _camera: 0,
  init: function cameraInit() {
    var video = this.video;
    if (video)
      video.parentNode.removeChild(video);

    video = this.video = document.createElement('video');
    video.setAttribute('autoplay', 'true');
    video.id = 'video';

    var container = document.getElementById("video-container");
    container.appendChild(video);

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
      container.style.MozTransform = transform;
    }

    var config = {
      width: width,
      height: height,
      camera: this._camera
    }
    video.style.width = width + "px";
    video.style.height = height + "px";
    video.style.filter = this._filter;

    video.src = navigator.mozCamera.getCameraURI(config);
  },
  
  toggleCamera: function toggleCamera() {
    this._camera = 1 - this._camera;
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

    this._filter = this.video.style.filter = '';
    target.classList.toggle('selected');
  }
};

window.addEventListener('DOMContentLoaded', function CameraInit() {
  Camera.init();
});

