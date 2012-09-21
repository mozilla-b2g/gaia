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
    this.wallpaperSnapshot = document.getElementById('wallpaper-snapshot');
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
        var url = 'url(' + event.settingValue + ')';
        self.wallpaperSnapshot.style.backgroundImage = url;
    });

    var lock = settings.createLock();
    var reqWallpaper = lock.get('wallpaper.image');
    reqWallpaper.onsuccess = function wallpaper_getWallpaperSuccess() {
      var url = 'url(' + reqWallpaper.result['wallpaper.image'] + ')';
      self.wallpaperSnapshot.style.backgroundImage = url;
    };
  },

  bindEvent: function wallpaper_bindEvent() {
    var self = this;
    var settings = navigator.mozSettings;
    this.wallpaperSnapshot.addEventListener('click',
      function onWallpaperClick() {
        var a = new MozActivity({
          name: 'pick',
          data: {
            type: 'image/jpeg',
            width: window.innerWidth,
            height: window.innerHeight
          }
        });

        a.onsuccess = function onPickSuccess() {
          if (!a.result.url)
            return;

          self.wallpaperSnapshot.style.backgroundImage =
            'url(' + a.result.url + ')';
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
