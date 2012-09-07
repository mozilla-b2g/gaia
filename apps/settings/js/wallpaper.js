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
    this.lockscreenSnapshot = document.getElementById('lockscreen-snapshot');
    this.homescreenSnapshot = document.getElementById('homescreen-snapshot');
  },

  init: function wallpaper_init() {
    this.getAllElements();
    this.loadCurrentWallpaper();
    this.bindEvent();
  },

  loadCurrentWallpaper: function wallpaper_loadCurrentWallpaper() {
    var self = this;
    var settings = navigator.mozSettings;
    settings.addObserver('homescreen.wallpaper',
      function onHomescreenChange(event) {
        var url = 'url(' + event.settingValue + ')';
        self.homescreenSnapshot.style.backgroundImage = url;
    });

    settings.addObserver('lockscreen.wallpaper',
      function onLockscreenChange(event) {
        var url = 'url(' + event.settingValue + ')';
        self.lockscreenSnapshot.style.backgroundImage = url;
    });

    var lockGet = settings.createLock().get;
    var reqHomescreen = lockGet('homescreen.wallpaper');
    reqHomescreen.onsuccess = function wallpaper_getHomescreenSuccess() {
      var url = 'url(' + reqHomescreen.result['homescreen.wallpaper'] + ')';
      self.homescreenSnapshot.style.backgroundImage = url;
    };

    var reqLockscreen = lockGet('lockscreen.wallpaper');
    reqLockscreen.onsuccess = function wallpaper_getLockscreenSuccess() {
      var url = 'url(' + reqLockscreen.result['lockscreen.wallpaper'] + ')';
      self.lockscreenSnapshot.style.backgroundImage = url;
    };
  },

  bindEvent: function wallpaper_bindEvent() {
    var self = this;
    var settings = navigator.mozSettings;
    this.homescreenSnapshot.addEventListener('click',
      function onHomescreenClick() {
      var a = new MozActivity({
        name: 'pick',
        data: {
          type: 'image/jpeg'
        }
      });
      a.onsuccess = function onCameraPhotosSuccess() {
        if (!a.result.dataurl)
          return;

        self.homescreenSnapshot.style.backgroundImage =
          'url(' + a.result.dataurl + ')';
        settings.createLock().set({'homescreen.wallpaper': a.result.dataurl});
        self.reopenSelf();
      };
      a.onerror = function onCameraPhotosError() {
        console.warn('pick failed!');
        self.reopenSelf();
      };
    });

    this.lockscreenSnapshot.addEventListener('click',
      function onLockscreenClick() {
      var a = new MozActivity({
        name: 'pick',
        data: {
          type: 'image/jpeg'
        }
      });
      a.onsuccess = function onCameraPhotosSuccess() {
        if (!a.result.dataurl)
          return;

        self.lockscreenSnapshot.style.backgroundImage =
          'url(' + a.result.dataurl + ')';
        settings.createLock().set({'lockscreen.wallpaper': a.result.dataurl});
        self.reopenSelf();
      };
      a.onerror = function onCameraPhotosError() {
        console.warn('pick failed!');
        self.reopenSelf();
      };
    });
  }
};

Wallpaper.init();

