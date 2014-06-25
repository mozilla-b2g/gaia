'use strict';

const Wallpaper = (function() {

  function onHomescreenContextmenu() {

    // Ask for the locked content key first, because if it does not exist
    // we know there is no locked content on the phone and we don't have
    // to show the Locked Content app in the activity request.
    ForwardLock.getKey(function(secret) {
      var a = new MozActivity({
        name: 'pick',
        data: {
          type: ['wallpaper', 'image/*'],
          includeLocked: (secret !== null),
          // XXX: This will not work with Desktop Fx / Simulator.
          width: window.screen.width * window.devicePixelRatio,
          height: window.screen.height * window.devicePixelRatio
        }
      });

      a.onsuccess = function onWallpaperSuccess() {
        var blob = a.result.blob;

        if (!blob)
          return;

        // If this is a locked image from the locked content app, unlock it
        if (blob.type.split('/')[1] === ForwardLock.mimeSubtype) {
          ForwardLock.unlockBlob(secret, blob, function(unlocked) {
            setWallpaper(unlocked);
          });
        }
        else {
          setWallpaper(blob);
        }

        function setWallpaper(blob) {
          navigator.mozSettings.createLock().set({
            'wallpaper.image': blob
          });
        }
      };

      a.onerror = function onWallpaperError() {
        console.warn('pick failed!');
      };
    });
  }

  return {
    contextmenu: onHomescreenContextmenu
  };
})();
