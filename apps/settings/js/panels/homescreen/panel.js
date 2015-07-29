/**
 * Manage wallpaper, default homescreen and replaceable homescreens.
 */
define(require => {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var Wallpaper = require('panels/homescreen/wallpaper');
  var HomescreenName = require('panels/homescreen/homescreen_name');

  var elements = {};

  return function ctor_homescreen_panel() {
    var wallpaper = Wallpaper();
    var homescreenName = HomescreenName();

    return SettingsPanel({
      onInit: function hp_onInit(panel) {
        elements = {
          wallpaper: panel.querySelector('.wallpaper'),
          wallpaperPreview: panel.querySelector('.wallpaper-preview'),
          currentHomescreen: panel.querySelector('#current-homescreen')
        };

        elements.wallpaper.addEventListener('click',
          wallpaper.selectWallpaper.bind(wallpaper));
      },

      onBeforeShow: function hp_onBeforeShow() {
        this._setWallpaperPreviewSrc(wallpaper.wallpaperSrc);
        this._setHomescreenName(homescreenName.name);

        wallpaper.observe('wallpaperSrc', this._setWallpaperPreviewSrc);
        homescreenName.observe('name', this._setHomescreenName);
      },

      onBeforeHide: function hp_onBeforeHide() {
        wallpaper.unobserve('wallpaperSrc');
        homescreenName.unobserve('name');
      },

      _setWallpaperPreviewSrc: function hp_setHomescreenName(src) {
        elements.wallpaperPreview.src = src;
      },

      _setHomescreenName: function hp_setHomescreenName(name) {
        elements.currentHomescreen.textContent = name;
      }
    });
  };
});
