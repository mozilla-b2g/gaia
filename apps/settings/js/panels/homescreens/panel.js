/**
 * Manage wallpaper and replaceable home screens.
 */
define(function(require) {
  'use strict';

  const VERTICALHOME_MANIFEST =
    'app://verticalhome.gaiamobile.org/manifest.webapp';

  var SettingsListener = require('shared/settings_listener');
  var SettingsPanel = require('modules/settings_panel');
  var Wallpaper = require('panels/homescreens/wallpaper');
  var HomescreenCols = require('panels/homescreens/homescreen_cols');
  var HomescreenName = require('panels/homescreens/homescreen_name');

  var elements = {};
  var gridSelect = null;

  return function ctor_homescreen_panel() {
    var wallpaper = Wallpaper();
    var homescreenCols = HomescreenCols();
    var homescreenName = HomescreenName();

    return SettingsPanel({
      /**
       * @param {HTMLElement} panel The panel HTML element.
       */
      onInit: function hp_onInit(panel) {
        elements = {
          wallpaper: panel.querySelector('.wallpaper'),
          wallpaperPreview: panel.querySelector('.wallpaper-preview'),
          currentHomescreen: panel.querySelector('.current-homescreen')
        };

        elements.wallpaper.addEventListener('click',
          wallpaper.selectWallpaper.bind(wallpaper));

        SettingsListener.observe('homescreen.manifestURL', '', manifestURL => {
          homescreenCols.verticalhomeActive =
            manifestURL === VERTICALHOME_MANIFEST;
        });

        gridSelect = panel.querySelector('[name="grid.layout.cols"]');
        gridSelect.addEventListener('change', function() {
          homescreenCols.setCols(this.value);
        });
      },

      onBeforeShow: function hp_onBeforeShow(panel, options) {
        this._setWallpaperPreviewSrc(wallpaper.wallpaperSrc);
        this._setHomescreenName(homescreenName.name);
        this._updateCols(homescreenCols.cols);

        homescreenCols.observe('cols', this._updateCols);

        wallpaper.observe('wallpaperSrc', this._setWallpaperPreviewSrc);
        homescreenName.observe('name', this._setHomescreenName);
      },

      onBeforeHide: function hp_onBeforeHide() {
        wallpaper.unobserve('wallpaperSrc');
        homescreenName.unobserve('name');
        homescreenCols.unobserve('cols');
      },

      /**
       * @param {String} src
       * @private
       */
      _setWallpaperPreviewSrc: function hp_setHomescreenName(src) {
        elements.wallpaperPreview.src = src;
      },

      /**
       * @param {Number} number The number of columns in the layout.
       * @private
       */
      _updateCols: function hdp_updateCols(number) {
        if (!number) {
          return;
        }

        var option =
          gridSelect.querySelector('[value="' + number + '"]');

        if (option) {
          option.selected = true;
        }
      },

      /**
       * @param {String} name
       * @private
       */
      _setHomescreenName: function hp_setHomescreenName(name) {
        elements.currentHomescreen.textContent = name;
      }
    });
  };
});
