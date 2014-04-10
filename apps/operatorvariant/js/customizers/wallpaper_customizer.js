/* global Customizer, Resources */

'use strict';

var WallpaperCustomizer = (function() {

  var WALLPAPER_IMAGE = 'wallpaper.image';

  Customizer.call(this, 'wallpaper', 'json');

  this.set = function(wallpaperParams) {
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

    // We only change the wallpaper if the user does not changed it previously
    // The user has changed the value if the actual value of wallpaper is
    // different from default value.
    var wallpaper = settings.createLock().get(WALLPAPER_IMAGE);
    wallpaper.onsuccess = function wc_onsucces() {
      var actualValue = wallpaper.result[WALLPAPER_IMAGE];
      var reader = new FileReader();
      reader.onloadend = function() {
        if (reader.result === wallpaperParams.default) {
          setWallpaper();
        }
      };
      reader.onerror = function() {
        console.error('Unable to convert current wallpaper blob to dataURI. ' +
                      reader.error.name);
      };
      reader.readAsDataURL(actualValue);
    };

    wallpaper.onerror = function wc_onerror() {
      console.error('Error requesting ' + WALLPAPER_IMAGE + '. ' +
                    wallpaper.error.name);
    };
  };
});

var wallpaperCustomizer = new WallpaperCustomizer();
wallpaperCustomizer.init();

