/* global Customizer, Resources */

'use strict';

var WallpaperCustomizer = (function() {

  Customizer.call(this, 'wallpaper', 'json');

  this.set = function(wallpaperParams) {
    if (!this.simPresentOnFirstBoot) {
      console.log('WallpaperCustomizer. No first RUN with configured SIM.');
      return;
    }

    var settings = navigator.mozSettings;
    if (!settings) {
      console.error('WallpaperCustomizer. Settings is not available');
      return;
    }

    function setWallpaper() {
      Resources.load(wallpaperParams.uri, 'blob', function onsuccess(blob) {
        settings.createLock().set({
          'wallpaper.image': blob
        });
      }, function onerror(status) {
        console.error('WallpaperCustomizer.js: Error retrieving the resource.' +
                      wallpaperParams.uri);
      });
    }

    setWallpaper();
  };
});

var wallpaperCustomizer = new WallpaperCustomizer();
wallpaperCustomizer.init();

