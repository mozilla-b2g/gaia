var Camera = {
  _camera: 0,
  _filter: 'none',

  init: function cameraInit() {
    var container = document.getElementById("video-container");
    var video = document.getElementById("video");
    var width, height;
    if (window.innerWidth > window.innerHeight) {
      width = window.innerWidth;
      height = window.innerHeight;
    } else {
      width = window.innerHeight;
      height = window.innerWidth;
      var deltaX = (width - height) / 2;
      var transform = "rotate(90deg)";
      if (this._camera == 1)
        transform += " scale(-1, 1)";
      container.style.MozTransform = transform;
    }
    var config = {
      width: width,
      height: height,
      camera: this._camera
    }
    video.style.width = width + "px";
    video.style.height = height + "px";
    if (this._filter != 'none')
      video.style.filter = this._filter;
    video.src = navigator.mozCamera.getCameraURI(config);
  },
  
  switchCamera: function switchCamera() {
    this._camera = 1 - this._camera;
    var video = document.getElementById("video");
    video.src = "";
    this.init();
  },
  
  switchFilter: function switchFilter(aFilter) {
    var current = document.getElementById("t" + this._filter);
    current.classList.remove("selected");
    var video = document.getElementById("video");
    if (aFilter != 'none')
      video.style.filter = "url('" + window.location.href + "#" + aFilter + "')";
    else
      video.style.filter = "";
    this._filter = aFilter;
    current = document.getElementById("t" + this._filter);
    current.classList.add("selected");
  }
};

window.addEventListener('DOMContentLoaded', function CameraInit() {
  Camera.init();
});
