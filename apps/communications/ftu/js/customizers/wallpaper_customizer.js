'use strict';

var WallpaperCustomizer = (function() {
  Customizer.call(this, 'wallpaper', 'blob');
  this.set = function(blob) {
    var request = navigator.mozSettings.createLock().set({
      'wallpaper.image': blob
    });
  };
});

var wallpaperCustomizer = new WallpaperCustomizer();
wallpaperCustomizer.init();
