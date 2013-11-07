'use strict';

var WallpaperCustomizer = (function() {
  var resourceParams = {
    type: 'blob'
  };

  Customizer.call(this, 'wallpaper', resourceParams);
  this.set = function(blob) {
    var request = navigator.mozSettings.createLock().set({
      'wallpaper.image': blob
    });
  };
});

var wallpaperCustomizer = new WallpaperCustomizer();
wallpaperCustomizer.init();
