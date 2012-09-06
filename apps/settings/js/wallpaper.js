'use strict';

var Wallpaper = {
  elements: {},

  reopenSelf: function wallpaper_reopenSelf() {
    navigator.mozApps.getSelf().onsuccess = function getSelfCB(evt) {
      var app = evt.target.result;
      app.launch();
    };
  },

  getAndBindAllElements: function wallpaper_getAllElements() {
    var elementsID = ['homescreen-wallpaper', 'homescreen-cameraphotos',
      'lockscreen-wallpaper', 'lockscreen-cameraphotos',
      'lockscreen-snapshot', 'homescreen-snapshot'];

    var toCamelCase = function toCamelCase(str) {
      return str.replace(/\-(.)/g, function replacer(str, p1) {
        return p1.toUpperCase();
      });
    };

    // Loop and add element with camel style name to Modal Dialog attribute.
    elementsID.forEach(function createElementRef(name) {
      this.elements[toCamelCase(name)] =
        document.getElementById(name);
      document.getElementById(name).addEventListener('click', this);
    }, this);
  },
  
  init: function wallpaper_init() {
    this.settings = navigator.mozSettings;
    if (!this.settings)
      return;

    this.getAndBindAllElements();
    this.loadCurrentWallpaper();
  },

  loadCurrentWallpaper: function wallpaper_loadCurrentWallpaper() {
    var self = this;
    var settings = this.settings;
    var reqHomescreen = settings.getLock().get('homescreen.wallpaper');
    reqHomescreen.onsuccess = function wallpaper_getHomescreenSuccess() {
      var url = 'url(' + reqHomescreen.result['homescreen.wallpaper'] + ')';
      self.elements.homescreenSnapshot.style.backgroundImage = url;
    };
    
    var reqLockscreen = settings.getLock().get('lockscreen.wallpaper');
    reqLockscreen.onsuccess = function wallpaper_getLockscreenSuccess() {
      var url = 'url(' + reqLockscreen.result['lockscreen.wallpaper'] + ')';
      self.elements.lockscreenSnapshot.style.backgroundImage = url;
    };
  },

  handleEvent: function wallpaper_handleEvent(evt) {
    evt.stopImmediatePropagation();

    var self = this;
    var target = evt.target;
    var property = '';
    var wallpaper = false;
    switch (target) {
      case this.elements['homescreenWallpaper']:
        wallpaper = true;
      case this.elements['homescreenCameraphotos']:
        var a = new MozActivity({
          name: 'pick',
          data: {
            type: 'image/jpeg', 
            wallpaper: wallpaper
          }
        });
        a.onsuccess = function onCameraPhotosSuccess() {
          var settings = navigator.mozSettings;
          self.elements.homescreenSnapshot.style.backgroundImage = 'url(' + a.result.dataurl + ')';
          settings.getLock().set({'homescreen.wallpaper': a.result.dataurl});
          self.reopenSelf();
        };
        a.onerror = function onCameraPhotosError() {
          console.warn('pick failed!');
          self.reopenSelf();
        };
        break;

      case this.elements['lockscreenWallpaper']:
        wallpaper = true;
      case this.elements['lockscreenCameraphotos']:
        var a = new MozActivity({
          name: 'pick',
          data: { type: 'image/jpeg', wallpaper: wallpaper }
        });
        a.onsuccess = function onCameraPhotosSuccess() {
          var settings = navigator.mozSettings;
          self.elements.lockscreenSnapshot.style.backgroundImage = 'url(' + a.result.dataurl + ')';
          settings.getLock().set({'lockscreen.wallpaper': a.result.dataurl});
          self.reopenSelf();
        };
        a.onerror = function onCameraPhotosError() {
          console.warn('pick failed!');
          self.reopenSelf();
        };
        break;
    }
  }
};

Wallpaper.init();

