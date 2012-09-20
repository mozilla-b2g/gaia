'use strict';

(function() {
  var overlay = document.getElementById('icongrid');

  // XXX: need automation app switch to activity caller itself
  var reopenSelf = function reopenSelf() {
    navigator.mozApps.getSelf().onsuccess = function getSelfCB(evt) {
      var app = evt.target.result;
      app.launch();
    };
  };

  overlay.addEventListener('contextmenu', function onHomescreenContextmenu() {
    var a = new MozActivity({
      name: 'pick',
      data: {
        type: 'image/jpeg',
        width: window.innerWidth,
        height: window.innerHeight
      }
    });
    a.onsuccess = function onWallpaperSuccess() {
      if (!a.result.url)
        return;

      var settings = navigator.mozSettings;
      settings.createLock().set({'wallpaper.image': a.result.url});
      reopenSelf();
    };
    a.onerror = function onWallpaperError() {
      console.warn('pick failed!');
      reopenSelf();
    };
  });
})();
