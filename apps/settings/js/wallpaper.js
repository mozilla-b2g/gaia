/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var Wallpaper = {
  getAllElements: function wallpaper_getAllElements() {
    this.preview = document.getElementById('wallpaper-preview');
    this.button = document.getElementById('wallpaper-button');
  },

  init: function wallpaper_init() {
    this.wallpaperURL = new SettingsURL();
    this.getAllElements();
    this.loadCurrentWallpaper();
    this.bindEvent();
  },

  loadCurrentWallpaper: function wallpaper_loadCurrentWallpaper() {
    var self = this;
    var settings = navigator.mozSettings;
    settings.addObserver('wallpaper.image',
      function onHomescreenChange(event) {
        self.preview.src = self.wallpaperURL.set(event.settingValue);
    });

    var lock = settings.createLock();
    var reqWallpaper = lock.get('wallpaper.image');
    reqWallpaper.onsuccess = function wallpaper_getWallpaperSuccess() {
      self.preview.src = self.wallpaperURL.set(this.result['wallpaper.image']);
    };
  },

  bindEvent: function wallpaper_bindEvent() {
    var self = this;
    var settings = navigator.mozSettings;
    var onWallpaperClick = function wallpaper_onWallpaperClick() {
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

        a.onsuccess = function onPickSuccess() {
          var blob = a.result.blob;
          var color = a.result.color;

          if (!blob)
            return;

          if (blob.type.split('/')[1] === ForwardLock.mimeSubtype) {
            // If this is a locked image from the locked content app, unlock it
            ForwardLock.unlockBlob(secret, blob, function(unlocked) {
              setWallpaper(unlocked);
            });
          } else {
            setWallpaper(blob);
          }

          function setWallpaper(blob) {
            navigator.mozSettings.createLock().set({
              'wallpaper.image': blob,
              'wallpaper.color': color
            });
          }
        };
        a.onerror = function onPickError() {
          console.warn('pick failed!');
        };
      });
    };
    this.preview.addEventListener('click', onWallpaperClick);
    this.button.addEventListener('click', onWallpaperClick);
  }
};

Wallpaper.init();
