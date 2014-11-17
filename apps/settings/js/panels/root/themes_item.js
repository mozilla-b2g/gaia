/**
 * This module is used to show/hide themes menuItem based on the number of
 * current installed themes.
 *
 * @module ThemesItem
 */
define(function(require) {
  'use strict';

  var AppsCache = require('modules/apps_cache');

  function ThemesItem(element) {
    this._enabled = false;
    this._element = element; 
    this._themeCount = 0;
    this._boundUpdateThemes = this._updateThemes.bind(this);
    this.init();
  }

  ThemesItem.prototype = {
    /**
     * Set current status of themesItem
     *
     * @access public
     * @param {Boolean} enabled
     * @memberOf ThemesItem
     */
    set enabled(enabled) {
      if (this._enabled === enabled) {
        return;
      } else {
        this._enabled = enabled;
        if (this._enabled) {
          this._updateThemeSectionVisibility();
        }
      }
    },

    /**
     * Get current status of themesItem
     *
     * @access public
     * @memberOf ThemesItem
     */
    get enabled() {
      return this._enabled;
    },

    /**
     * Initialization
     *
     * @access private
     * @memberOf ThemesItem
     * @return {Promise}
     */
    init: function() {
      var self = this;
      AppsCache.addEventListener('install', this._boundUpdateThemes);
      AppsCache.addEventListener('uninstall', this._boundUpdateThemes);
      return AppsCache.apps().then(function(apps) {
        apps.some(function(app) {
          if (self._isThemeApp(app)) {
            self._themeCount += 1;
          }
        });
        self._updateThemeSectionVisibility();
      });
    },

    /**
     * Check whether this app is theme app
     *
     * @param {Object} app
     * @returns {Boolean}
     * @memberOf ThemesItem
     */
    _isThemeApp: function(app) {
      var manifest = app.manifest || app.updateManifest;
      return manifest.role === 'theme';
    },

    /**
     * We have to update theme count based on incoming evt and
     * decide to show/hide or not.
     *
     * @param {Object} evt
     * @memberOf ThemesItem
     */
    _updateThemes: function(evt) {
      var app = evt && evt.application;
      var type = evt.type;

      if (this._isThemeApp(app)) {
        if (type === 'install') {
          this._themeCount += 1;
        } else if (type === 'uninstall') {
          this._themeCount -= 1;
        }
        this._updateThemeSectionVisibility();
      }
    },

    /**
     * Update theme section visibility based on _themeCount
     *
     * @memberOf ThemesItem
     */
    _updateThemeSectionVisibility: function() {
      this._element.hidden = (this._themeCount < 2);
    }
  };

  return function ctor_themesItem(element) {
    return new ThemesItem(element);
  };
});
