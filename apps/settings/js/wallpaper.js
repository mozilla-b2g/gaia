'use strict';

(function(){
  var wallpaper = document.getElementById('homescreen-wallpaper');
  var cameraphotos = document.getElementById('homescreen-cameraphotos');

  wallpaper.addEventListener('click', function onWallpaperClick(evt) {
    evt.stopImmediatePropagation();
    var a = new MozActivity({name: 'pick', data: {type: 'image/jpeg', preload: true}});
    a.onsuccess = function onWallpaperSuccess() {
      var settings = navigator.mozSettings;
      settings.getLock().set({'homescreen.wallpaper': a.result.filename});
    };
    a.onerror = function onWallpaperError() {
      console.warn('pick failed!');
    };
  });;

  cameraphotos.addEventListener('click', function onCameraPhotosClick(evt) {
    evt.stopImmediatePropagation();
    var a = new MozActivity({name: 'pick', data: {type: 'image/jpeg', preload: false}});
    a.onsuccess = function onCameraPhotosSuccess() {
      var settings = navigator.mozSettings;
      settings.getLock().set({'homescreen.wallpaper': a.result.filename});
    };
    a.onerror = function onCameraPhotosError() {
      console.warn('pick failed!');
    };
  });
})();
