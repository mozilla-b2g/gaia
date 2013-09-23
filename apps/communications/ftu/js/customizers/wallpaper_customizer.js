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

  setWallpaper: function wc_setWallpaper(blob) {
    if (blob) {
      navigator.mozSettings.createLock().set({
        'wallpaper.image': blob
      });
    }
  }

};
WallpaperCustomizer.init();
