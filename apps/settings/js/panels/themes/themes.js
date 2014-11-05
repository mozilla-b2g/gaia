define(function(require) {
  'use strict';

  var ManifestHelper = require('shared/manifest_helper');
  var SettingsCache = require('modules/settings_cache');
  var ListView = require('modules/mvvm/list_view');
  var template = require('./layout_template');
  var THEME_SELECTED = 'theme.selected';
  var WALLPAPER_LIST = '/wallpaper.json';
  var WALLPAPER_KEY = 'wallpaper.image';

  var Themes = function ctor_themes() {
    return {
      _container: null,
      _settings: null,
      _selectedTheme: null,
      _themes: null,
      _config: {},

      onInit: function th_onInit(panel) {
        this._container = panel.querySelector('.theme-list');
        this._settings = navigator.mozSettings;
      },

      onBeforeShow: function th_onBeforeShow() {
        this._themes = [];
        this.getInstalledThemes((this.setTheme));
      },

      getInstalledThemes: function th_getInstalledThemes(callback) {
        window.navigator.mozApps.mgmt.getAll().onsuccess =
          function mozAppGotAll(evt) {
            var apps = evt.target.result.filter(function(app) {
              var manifest = app.manifest || app.updateManifest;
              return manifest && manifest.type &&
                manifest.type === 'certified' &&
                manifest.role && manifest.role === 'theme';
            });
            for (var app in apps) {
              var manifest = new ManifestHelper(apps[app].manifest);
              var theme = {
                'name': manifest.name,
                'manifestURL': apps[app].manifestURL,
                'onclick': callback.bind(this)
              };
              this._themes.push(theme);
            }

            this._themes.sort(function(a, b) {
              return a.name.localeCompare(b.name);
            });
            this.renderThemes();
          }.bind(this);
      },

      renderThemes: function th_renderThemes() {
        this._listView = ListView(this._container, this._themes, template);
        this.updateRadioButtons();
      },

      updateRadioButtons: function th_updateRadioButtons() {
        var currentSetting = SettingsCache.cache;
        var theme = this._selectedTheme = currentSetting[THEME_SELECTED];
        var rule = 'input[value="' + theme + '"]';
        var node = this._container.querySelector(rule);
        if (node) {
          node.checked = true;
        }
      },

      setTheme: function th_setTheme(theme) {
        if (this._selectedTheme === theme) {
          return;
        }
        var setting = {};
        setting[THEME_SELECTED] = this._selectedTheme = theme;
        this._settings.createLock().set(setting)
          .onsuccess = (function() {
            this.getWallpaperPath().
              then((this.loadWallpaper).bind(this)).
              then((this.setWallpaper).bind(this));
          }).bind(this);
      },

      /**
       *  Given the current them set, we get the path for the
       *  image set as background.
       *  @returns {Promise} fulfilled with the path to the wallpaper
       */
      getWallpaperPath: function th_getWallpaper() {
        var url = this._selectedTheme
          .substring(0, this._selectedTheme.lastIndexOf('/')) + WALLPAPER_LIST;

        var xhr = new XMLHttpRequest({ mozSystem: true });
        xhr.open('GET', url, true);
        xhr.responseType = 'json';
        return new Promise(function(resolve, reject) {
          xhr.onload = function successGettingWallpaperList() {
            if (xhr.status !== 200) {
              reject(xhr.status);
              return;
            }
            var filename = xhr.response.homescreen;
            resolve(filename);
          };
          xhr.send(null);
        });
      },

      /**
       *  Load an image {blob} from another app via XHR.
       *  @params filename {String} path to the wallpaper on current theme.
       *  @returns {Promise} fulfilled with the blob.
       */
      loadWallpaper: function th_loadWallpaper(filename) {
        var url = this._selectedTheme.substring(0, this._selectedTheme
          .lastIndexOf('/')) + filename;

        var xhr = new XMLHttpRequest({ mozSystem: true });
        xhr.open('GET', url, true);
        xhr.responseType = 'blob';
        return new Promise(function(resolve, reject) {
          xhr.onload = function() {
            if (xhr.status !== 200) {
              reject(xhr.status);
              return;
            }
            resolve(xhr.response);
          };
          xhr.send(null);
        });
      },

      /**
       *  Saves current wallpaper configuration.
       *  @returns {Promise} fulfilled when config is saved.
       */
      setWallpaper: function th_setWallpaper(blob) {
        this._config[WALLPAPER_KEY] = blob;
        var self = this;
        return new Promise(function(resolve, reject) {
          var request = self._settings.createLock().set(self._config);
          request.onerror = reject;
          request.onsuccess = resolve;
        });
      }
    };
  };
  return Themes;
});
