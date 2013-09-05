'use strict';

const Wallpaper = (function() {

  function onHomescreenContextmenu() {
    var a = new MozActivity({
      name: 'pick',
      data: {
        type: 'image/jpeg',
        width: 320,
        height: 480
      }
    });

    a.onsuccess = function onWallpaperSuccess() {
      if (!a.result.blob)
        return;

      var reader = new FileReader();
      reader.readAsDataURL(a.result.blob);
      reader.onload = function() {
        navigator.mozSettings.createLock().set({
          'wallpaper.image': reader.result
        });
        reader.onload = reader.onerror = null;
      };
      reader.onerror = function(e) {
        console.error('Error reading the blob returned by the activity', e);
        reader.onload = reader.onerror = null;
      };
    };

    a.onerror = function onWallpaperError() {
      console.warn('pick failed!');
    };
  }

  return {
    select: onHomescreenContextmenu,

    init: function init() {
      var overlay = document.getElementById('icongrid');
      overlay.addEventListener('contextmenu', onHomescreenContextmenu);
    }
  };
})();
