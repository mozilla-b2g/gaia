var Wallpaper = {
  wallpapersUrl: '/resources/list.json',

  init: function wallpaper_init() {
    var self = this;
    if (navigator.mozSetMessageHandler) {
      navigator.mozSetMessageHandler('activity', function handler(request) {
        var activityName = request.source.name;
        if (activityName !== 'pick')
          return;
        self.startPick(request);
      });
    }

    this.cancelButton = document.getElementById('cancel');
    this.wallpapers = document.getElementById('wallpapers');
    this.generateWallpaperList();
  },

  generateWallpaperList: function wallpaper_generateWallpaperList(cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', this.wallpapersUrl, true);
    xhr.responseType = 'json';
    xhr.send(null);

    var self = this;
    xhr.onload = function successGenerateWallpaperList() {
      self.wallpapers.innerHTML = '';
      xhr.response.forEach(function(wallpaper) {
        var div = document.createElement('div');
        div.classList.add('wallpaper');
        div.style.backgroundImage = 'url(resources/' + wallpaper + ')';
        self.wallpapers.appendChild(div);
      });
      if (cb) {
        cb();
      }
    };
  },

  startPick: function wallpaper_startPick(request) {
    this.pickActivity = request;
    this.wallpapers.addEventListener('click', this.pickWallpaper.bind(this));
    this.cancelButton.addEventListener('click', this.cancelPick.bind(this));
  },

  pickWallpaper: function wallpaper_pickWallpaper(e) {
    // Identify the wallpaper
    var backgroundImage = e.target.style.backgroundImage;
    var src = backgroundImage.match(/url\([\"']?([^\s\"']*)[\"']?\)/)[1];
    // Ignore clicks that are not on one of the images
    if (src == '')
      return;

    if (!this.pickActivity) { return; }

    var img = new Image();
    img.src = src;
    var self = this;
    img.onload = function() {
      var canvas = document.createElement('canvas');
      var context = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      context.drawImage(img, 0, 0);

      var color_ = self.getImageColor(context, canvas.width, canvas.height);

      canvas.toBlob(function(blob) {
        self.pickActivity.postResult({
          type: 'image/jpeg',
          blob: blob,
          name: src,
          color: color_
        }, 'image/jpeg');

        self.endPick();
      }, 'image/jpeg');
    };
  },

  cancelPick: function wallpaper_cancelPick() {
    this.pickActivity.postError('cancelled');
    this.endPick();
  },

  endPick: function wallpaper_endPick() {
    this.pickActivity = null;
    this.cancelButton.removeEventListener('click', this.cancelPick);
    this.wallpapers.removeEventListener('click', this.pickWallpaper);
  },

  getImageColor:
    function wallpaper_getImageColor(context, imageWidth, imageHeight) {
    var imageData = context.getImageData(0, 0, imageWidth, imageHeight);
    var data = imageData.data;
    var r = 0, g = 0, b = 0;

    for (var row = 0; row < imageHeight; row++) {
      for (var col = 0; col < imageWidth; col++) {
        r += data[((imageWidth * row) + col) * 4];
        g += data[((imageWidth * row) + col) * 4 + 1];
        b += data[((imageWidth * row) + col) * 4 + 2];
      }
    }

    r = parseInt(r / (imageWidth * imageHeight));
    g = parseInt(g / (imageWidth * imageHeight));
    b = parseInt(b / (imageWidth * imageHeight));

    return 'rgba(' + r + ', ' + g + ', ' + b + ', 0.6)';
  }
};

window.addEventListener('load', function pick() {
  window.removeEventListener('load', pick);
  Wallpaper.init();
});
