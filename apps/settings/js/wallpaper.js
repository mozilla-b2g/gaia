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
      'lockscreen-wallpaper', 'lockscreen-cameraphotos'];

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
    this.getAndBindAllElements();
  },
  handleEvent: function wallpaper_handleEvent(evt) {
    evt.stopImmediatePropagation();

    var target = evt.target;
    var property = '';
    switch (target) {
      case this.elements['homescreenWallpaper']:
        var a = new MozActivity({
          name: 'pick',
          data: { type: 'image/jpeg', preload: true }
        });
        a.onsuccess = function onWallpaperSuccess() {
          var settings = navigator.mozSettings;
          settings.getLock().set({'homescreen.wallpaper': a.result.filename});
          reopenSelf();
        };
        a.onerror = function onWallpaperError() {
          console.warn('pick failed!');
          reopenSelf();
        };
        break;
      case this.elements['homescreenCameraphotos']:
        var a = new MozActivity({
          name: 'pick',
          data: { type: 'image/jpeg', preload: true }
        });
        a.onsuccess = function onCameraPhotosSuccess() {
          var settings = navigator.mozSettings;
          settings.getLock().set({'homescreen.wallpaper': a.result.filename});
          reopenSelf();
        };
        a.onerror = function onCameraPhotosError() {
          console.warn('pick failed!');
          reopenSelf();
        };
        break;
      case this.elements['lockscreenWallpaper']:
        var a = new MozActivity({
          name: 'pick',
          data: { type: 'image/jpeg', preload: true }
        });
        a.onsuccess = function onCameraPhotosSuccess() {
          var settings = navigator.mozSettings;
          settings.getLock().set({'lockscreen.wallpaper': a.result.filename});
          reopenSelf();
        };
        a.onerror = function onCameraPhotosError() {
          console.warn('pick failed!');
          reopenSelf();
        };
        break;
      case this.elements['lockscreenCameraphotos']:
        var a = new MozActivity({
          name: 'pick',
          data: { type: 'image/jpeg', preload: true }
        });
        a.onsuccess = function onCameraPhotosSuccess() {
          var settings = navigator.mozSettings;
          settings.getLock().set({'lockscreen.wallpaper': a.result.filename});
          reopenSelf();
        };
        a.onerror = function onCameraPhotosError() {
          console.warn('pick failed!');
          reopenSelf();
        };
        break;
    }
  },
  startActivity: function(property) {
  }
};

Wallpaper.init();

