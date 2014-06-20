var Wallpaper = {
  // We're reducing each image to 1/3rd of its original size by displaying
  // 3 wallpaper images in each row, decoding each image at 3/8ths of the
  // original size still results in an image that is big enough to fit the
  // thumbnails since 3/8 > 1/3
  thumbnailScale: 3 / 8,
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
    // Get #-moz-samplesize media fragment to downsample while decoding
    // so that we can display smaller images without using lot of memory
    // See Bug 1011460
    var sampleSize = Downsample.sizeNoMoreThan(this.thumbnailScale);
    xhr.onload = function successGenerateWallpaperList() {
      self.wallpapers.innerHTML = '';
      xhr.response.forEach(function(wallpaper) {
        var fileName = 'resources/' + wallpaper;
        var div = document.createElement('div');
        div.classList.add('wallpaper');
        div.dataset.filename = fileName;
        div.style.backgroundImage = 'url(' + fileName + sampleSize + ')';
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
    // Get the wallpaper file name
    var src = e.target.dataset.filename;
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

      canvas.toBlob(function(blob) {
        self.pickActivity.postResult({
          type: 'image/jpeg',
          blob: blob,
          name: src
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
  }
};

window.addEventListener('load', function pick() {
  window.removeEventListener('load', pick);
  Wallpaper.init();
});
