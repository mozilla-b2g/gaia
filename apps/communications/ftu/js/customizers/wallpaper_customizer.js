'use strict';

var WallpaperCustomizer = {
  init: function wc_init() {
    var self = this;
    window.addEventListener('customization', function updateWallpaper(event) {
      if (event.detail.setting === 'wallpaper') {
        window.removeEventListener('customization', updateWallpaper);
        self.setWallpaper(event.detail.value);
      }
    });
  },

  retrieveWallpaper: function wc_retrieveWallpaper(url, onsuccess, onerror) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'blob';
    xhr.onload = function(e) {
      if (xhr.status === 200) {
        onsuccess && onsuccess(this.response);
      } else {
        onerror && onerror();
      }
    };

    try {
      xhr.send();
    } catch (e) {
      onerror && onerror();
    }
  },

  setWallpaperSetting: function wc_setWallpaperSetting(base64Image) {
    var request = navigator.mozSettings.createLock().set({
      'wallpaper.image': base64Image
    });
  },

  setWallpaper: function wc_setWallpaper(url) {
    this.retrieveWallpaper(url, function(blob) {
      this.setWallpaperSetting(base64Image).bind(this);
      }, function onerrorRetrieving() {
      console.log('Error retrieving the file ' + url);
    }).bind(this);
  }
};
WallpaperCustomizer.init();
