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
    this.settings = navigator.mozSettings;
    if (!this.settings)
      return;

    this.getAllElements();
    this.loadCurrentWallpaper();
    this.bindEvent();
  },

  loadCurrentWallpaper: function wallpaper_loadCurrentWallpaper() {
    var self = this;
    var settings = this.settings;
    var reqHomescreen = settings.getLock().get('homescreen.wallpaper');
    reqHomescreen.onsuccess = function wallpaper_getHomescreenSuccess() {
      var url = 'url(' + reqHomescreen.result['homescreen.wallpaper'] + ')';
      self.homescreenSnapshot.style.backgroundImage = url;
    };
    
    var reqLockscreen = settings.getLock().get('lockscreen.wallpaper');
    reqLockscreen.onsuccess = function wallpaper_getLockscreenSuccess() {
      var url = 'url(' + reqLockscreen.result['lockscreen.wallpaper'] + ')';
      self.lockscreenSnapshot.style.backgroundImage = url;
    };
  },

  bindEvent: function wallpaper_bindEvent() {
    var self = this;
    this.homescreenSnapshot.addEventListener('click', function onHomescreenClick() {
      var a = new MozActivity({
        name: 'pick',
        data: {
          type: 'image/jpeg' 
        }
      });
      a.onsuccess = function onCameraPhotosSuccess() {
        self.homescreenSnapshot.style.backgroundImage = 'url(' + a.result.dataurl + ')';
        self.settings.getLock().set({'homescreen.wallpaper': a.result.dataurl});
        self.reopenSelf();
      };
      a.onerror = function onCameraPhotosError() {
        console.warn('pick failed!');
        self.reopenSelf();
      };
    });

    this.lockscreenSnapshot.addEventListener('click', function onLockscreenClick() {
      var a = new MozActivity({
        name: 'pick',
        data: {
          type: 'image/jpeg' 
        }
      });
      a.onsuccess = function onCameraPhotosSuccess() {
        self.lockscreenSnapshot.style.backgroundImage = 'url(' + a.result.dataurl + ')';
        self.settings.getLock().set({'lockscreen.wallpaper': a.result.dataurl});
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

