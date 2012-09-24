'use strict';

var Wallpaper = {
  // XXX: We should not need to reopen ourself.
  reopenSelf: function wallpaper_reopenSelf() {
    navigator.mozApps.getSelf().onsuccess = function getSelfCB(evt) {
      var app = evt.target.result;
      app.launch();
    };
  },

  getAllElements: function wallpaper_getAllElements() {
    this.preview = document.getElementById('wallpaper-preview');
  },

  init: function wallpaper_init() {
    this.getAllElements();
    this.loadCurrentWallpaper();
    this.bindEvent();
  },

  loadCurrentWallpaper: function wallpaper_loadCurrentWallpaper() {
    var self = this;
    var settings = navigator.mozSettings;
    settings.addObserver('wallpaper.image',
      function onHomescreenChange(event) {
        self.preview.src = event.settingValue;
    });

    var lock = settings.createLock();
    var reqWallpaper = lock.get('wallpaper.image');
    reqWallpaper.onsuccess = function wallpaper_getWallpaperSuccess() {
      self.preview.src = reqWallpaper.result['wallpaper.image'];
    };
  },

  bindEvent: function wallpaper_bindEvent() {
    var self = this;
    var settings = navigator.mozSettings;
    this.preview.addEventListener('click',
      function onWallpaperClick() {
        var a = new MozActivity({
          name: 'pick',
          data: {
            type: 'image/jpeg',
            width: 320,
            height: 480
          }
        });

        a.onsuccess = function onPickSuccess() {
          if (!a.result.url)
            return;

          self.preview.src = a.result.url;
          settings.createLock().set({'wallpaper.image': a.result.url});
          self.reopenSelf();
        };
        a.onerror = function onPickError() {
          console.warn('pick failed!');
          self.reopenSelf();
        };
      });
  }
};

Wallpaper.init();
