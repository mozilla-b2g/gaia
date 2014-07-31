/* global loadJSON */
/**
 * The display panel allow user to modify timeout forscreen-off, brightness, and
 * change wallpaper.
 */
define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var DisplayModule = require('panels/display/display');
  var WallpaperModule = require('panels/display/wallpaper');

  var wallpaperElements = {};
  var displayElements = {};

  return function ctor_display_panel() {
    var display = DisplayModule();
    var wallpaper = WallpaperModule();

    return SettingsPanel({
      onInit: function dp_onInit(panel) {
        displayElements = {
          brightnessManual: panel.querySelector('.brightness-manual'),
          brightnessAuto: panel.querySelector('.brightness-auto')
        };

        wallpaperElements = {
          wallpaper: panel.querySelector('.wallpaper'),
          wallpaperPreview: panel.querySelector('.wallpaper-preview')
        };

        wallpaperElements.wallpaper.addEventListener('click',
          wallpaper.selectWallpaper.bind(wallpaper));
        loadJSON(['/resources/sensors.json'], function(data) {
          display.init(displayElements, data);
        });
      },

      onBeforeShow: function dp_onBeforeShow() {
        wallpaper.observe('wallpaperSrc', function(newValue) {
          wallpaperElements.wallpaperPreview.src = newValue;
        });
        wallpaperElements.wallpaperPreview.src = wallpaper.wallpaperSrc;
      },

      onBeforeHide: function dp_onBeforeHide() {
        wallpaper.unobserve('wallpaperSrc');
      }
    });
  };
});
