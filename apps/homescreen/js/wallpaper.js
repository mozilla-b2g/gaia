'use strict';

(function(){
  var wallpaper = document.getElementById('wallpaper');
  var cameraphotos = document.getElementById('cameraphotos');

  wallpaper.onclick = function onWallpaperClick() {
    var a = new MozActivity({name: 'pick', data: {type: 'image/jpeg', preload: true}});
    a.onsuccess = function onWallpaperSuccess() {
      var settings = navigator.mozSettings;
      settings.getLock().set({'homescreen.wallpaper': a.result.filename});
    };
    a.onerror = function onWallpaperError() {
      console.warn('pick failed!');
    };
  };

  cameraphotos.onclick = function onCameraPhotosClick() {
    var a = new MozActivity({name: 'pick', data: {type: 'image/jpeg', preload: false}});
    a.onsuccess = function onCameraPhotosSuccess() {
      var settings = navigator.mozSettings;
      settings.getLock().set({'homescreen.wallpaper': a.result.filename});
    };
    a.onerror = function onCameraPhotosError() {
      console.warn('pick failed!');
    };
  };
})();
