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
          name: src,
          color: self.getImageColor(context, canvas.width, canvas.height)
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

    r = r / (imageWidth * imageHeight) / 255;
    g = g / (imageWidth * imageHeight) / 255;
    b = b / (imageWidth * imageHeight) / 255;

    // http://en.wikipedia.org/wiki/HSL_and_HSV#Formal_derivation
    var M = Math.max(r, g, b);
    var m = Math.min(r, g, b);
    var C = M - m;
    var h, s, l;

    l = 0.5 * (M + m);
    if (C == 0) {
      h = s = 0; // no satuaration (monochromatic)
    } else {
      switch (M) {
        case r:
          h = ((g - b) / C) % 6;
          break;
        case g:
          h = ((b - r) / C) + 2;
          break;
        case b:
          h = ((r - g) / C) + 4;
          break;
      }
      h *= 60;
      h = (h + 360) % 360;
      s = C / (1 - Math.abs(2 * l - 1));
    }

    h = parseInt(h);
    s = parseInt(s * 100) + '%';
    l = parseInt(l * 100) + '%';
    return 'hsla(' + h + ', ' + s + ', ' + l + ', 0.7)';
  }
};

window.addEventListener('load', function pick() {
  window.removeEventListener('load', pick);
  Wallpaper.init();
});
