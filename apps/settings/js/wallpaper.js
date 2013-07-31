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
      var a = new MozActivity({
        name: 'pick',
        data: {
          type: 'image/jpeg',
          width: 320,
          height: 480
        }
      });

      a.onsuccess = function onPickSuccess() {
        if (!a.result.blob)
          return;

        navigator.mozSettings.createLock().set({
          'wallpaper.image': a.result.blob
        });
      };
      a.onerror = function onPickError() {
        console.warn('pick failed!');
      };
    };
    this.preview.addEventListener('click', onWallpaperClick);
    this.button.addEventListener('click', onWallpaperClick);
  }
};

Wallpaper.init();

