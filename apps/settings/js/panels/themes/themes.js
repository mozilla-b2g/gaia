define(function(require) {
  'use strict';

  var AppsCache = require('modules/apps_cache');
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
      _previousTheme: null,
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
        AppsCache.apps().then(function(apps) {
          apps = apps.filter(function(app) {
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
        }.bind(this));
      },

      renderThemes: function th_renderThemes() {
        this._listView = ListView(this._container, this._themes, template);
        this.updateRadioButtons();
      },

      updateRadioButtons: function th_updateRadioButtons() {
        var currentSetting = SettingsCache.cache;
        if (!currentSetting) {
          return;
        }
        var theme = this._selectedTheme = currentSetting[THEME_SELECTED];
        this._updateRow(theme, true);
      },

      _doSetTheme: function th_doSetTheme(theme) {
        if (this._selectedTheme === theme) {
          return Promise.resolve();
        }
        return new Promise((function(resolve, reject) {
          var setting = {};
          this._previousTheme = this._selectedTheme;
          setting[THEME_SELECTED] = this._selectedTheme = theme;
          var req = this._settings.createLock().set(setting);
          req.onsuccess = (function() {
            this.getWallpaperPath().
              then((this.loadWallpaper).bind(this)).
              then((this.setWallpaper).bind(this)).
              then((this.saveConfig).bind(this)).then(resolve, reject);
          }).bind(this);
          req.onerror = reject;
        }).bind(this));
      },

      setTheme: function th_setTheme(theme) {
        this.disableSelection();
        return this._doSetTheme(theme).then(this.enableSelection.bind(this),
          this.rollbackTheme.bind(this));
      },

      /**
       * Setting a theme will happen in a two steps process, we will first
       * set the theme manifest, and after that we will save any other setting
       * related to the new theme.
       * If an error happens in any of those two processes, we will need to
       * be sure that we enable back the previous theme selection
       */
      rollbackTheme: function th_rollbackTheme() {
        this._config = {};
        if (this._previousTheme === this._selectedTheme ||
          this._previousTheme === null) {
          return Promise.reject('No previous theme to rollback');
        }
        var previous = '' + this._previousTheme;
        var current = '' + this._selectedTheme;
        return this._doSetTheme(this._previousTheme).then((function() {
          this._updateRow(previous, true);
          this._updateRow(current, false);
          this.enableSelection();
        }).bind(this));
      },

      _updateRow: function th_updateRow(theme, checked) {
        var rule = 'input[value="' + theme + '"]';
        var node = this._container.querySelector(rule);
        if (node) {
          node.checked = !!checked;
        }
      },

      disableSelection: function th_disableSelection() {
        var nodes = this._container.querySelectorAll('input:not([value="' +
         this._selectedTheme + '"])');
        if (nodes) {
          Array.prototype.slice.call(nodes).forEach(function(node) {
            node.parentNode.parentNode.classList.add('disabled');
          });
        }
      },

      enableSelection: function th_enableSelection() {
        var nodes = this._container.querySelectorAll('input');
        if (nodes) {
          Array.prototype.slice.call(nodes).forEach(function(node) {
            node.parentNode.parentNode.classList.remove('disabled');
          });
        }
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
        if (!filename) {
          return Promise.resolve(null);
        }
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
       *  Saves in memory the configuration for wallpaper. saveConfig
       *  will need to be invoked to make this changes permanent.
       *  @returns {Promise} fulfilled inmediately.
       */
      setWallpaper: function th_setWallpaper(blob) {
        this._config[WALLPAPER_KEY] = blob;
        return Promise.resolve(this._config);
      },

      /**
       * Perform the operation to writing to settings
       * @returns {Promise} fulfilled when config is saved
       */
      saveConfig: function th_saveConfig() {
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
