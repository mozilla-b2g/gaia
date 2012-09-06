'use strict';

(function() {
  var wallpaper = document.getElementById('wallpaper');
  var cameraphotos = document.getElementById('cameraphotos');
  var reopenSelf = function reopenSelf() {
    navigator.mozApps.getSelf().onsuccess = function getSelfCB(evt) {
      var app = evt.target.result;
      app.launch();
    };
  };

  wallpaper.onclick = function onWallpaperClick() {
    var a = new MozActivity({
      name: 'pick',
      data: {
        type: 'image/jpeg',
        preload: true
      }
    });
    a.onsuccess = function onWallpaperSuccess() {
      var settings = navigator.mozSettings;
      settings.getLock().set({'homescreen.wallpaper': a.result.dataurl});
      reopenSelf();
    };
    a.onerror = function onWallpaperError() {
      console.warn('pick failed!');
      reopenSelf();
    };
  };

  cameraphotos.onclick = function onCameraPhotosClick() {
    var a = new MozActivity({
      name: 'pick',
      data: {
        type: 'image/jpeg',
        preload: false
      }
    });
    a.onsuccess = function onCameraPhotosSuccess() {
      var settings = navigator.mozSettings;
      settings.getLock().set({'homescreen.wallpaper': a.result.dataurl});
      reopenSelf();
    };
    a.onerror = function onCameraPhotosError() {
      console.warn('pick failed!');
      reopenSelf();
    };
  };
})();
