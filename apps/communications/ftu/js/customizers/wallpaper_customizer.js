'use strict';

var wallpaperCustomizer = {
  init: function wc_init() {
    var self = this;
    window.addEventListener('customization', function updateWallpaper(event) {
      window.removeEventListener('customization', updateWallpaper);
      if (event.detail.setting === 'wallpaper') {
        self.setWallpaper(event.detail.value);
      }
    });
  },

  setWallpaper: function wc_setWallpaper(blob) {
    if (blob) {
      navigator.mozSettings.createLock().set({
        'wallpaper.image': blob
      });
    }
  }

};
wallpaperCustomizer.init();
