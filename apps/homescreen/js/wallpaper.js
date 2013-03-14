'use strict';

const Wallpaper = (function() {
  var overlay = document.getElementById('icongrid');

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
      };
    };
    a.onerror = function onWallpaperError() {
      console.warn('pick failed!');
    };
  }

  return {
    init: function init() {
      overlay.addEventListener('contextmenu', onHomescreenContextmenu);
    }
  };
})();
