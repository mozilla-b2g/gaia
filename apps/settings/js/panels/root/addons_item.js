/**
 * This module is used to show/hide addon menuItem based on the number of
 * current installed addons.
 *
 * @module AddonsItem
 */
define(function(require) {
  'use strict';

  var AppsCache = require('modules/apps_cache');

  function AddonsItem(element) {
    this._enabled = false;
    this._element = element;
    this._addonCount = 0;
    this._boundUpdateAddons = this._updateAddons.bind(this);
    this.init();
  }

  AddonsItem.prototype = {
    /**
     * Set current status of addonsItem
     *
     * @access public
     * @param {Boolean} enabled
     * @memberOf AddonsItem
     */
    set enabled(enabled) {
      if (this._enabled === enabled) {
        return;
      } else {
        this._enabled = enabled;
        if (this._enabled) {
          this._updateAddonSectionVisibility();
        }
      }
    },

    /**
     * Get current status of addonsItem
     *
     * @access public
     * @memberOf AddonsItem
     */
    get enabled() {
      return this._enabled;
    },

    /**
     * Initialization
     *
     * @access private
     * @memberOf AddonsItem
     * @return {Promise}
     */
    init: function() {
      var self = this;
      AppsCache.addEventListener('install', this._boundUpdateAddons);
      AppsCache.addEventListener('uninstall', this._boundUpdateAddons);
      return AppsCache.apps().then(function(apps) {
        apps.some(function(app) {
          if (self._isAddon(app)) {
            self._addonCount += 1;
          }
        });
        self._updateAddonSectionVisibility();
      });
    },

    /**
     * Check whether this app is an addon
     *
     * @param {Object} app
     * @returns {Boolean}
     * @memberOf AddonsItem
     */
    _isAddon: function(app) {
      var manifest = app.manifest || app.updateManifest;
      return manifest.role === 'addon';
    },

    /**
     * We have to update the addon count based on incoming evt and
     * decide to show/hide or not.
     *
     * @param {Object} evt
     * @memberOf AddonsItem
     */
    _updateAddons: function(evt) {
      var app = evt && evt.application;
      var type = evt.type;

      if (this._isAddon(app)) {
        if (type === 'install') {
          this._addonCount += 1;
        } else if (type === 'uninstall') {
          this._addonCount -= 1;
        }
        this._updateAddonSectionVisibility();
      }
    },

    /**
     * Update addon section visibility based on _addonCount
     *
     * @memberOf AddonsItem
     */
    _updateAddonSectionVisibility: function() {
      this._element.hidden = this._addonCount == 0;
    }
  };

  return function(element) {
    return new AddonsItem(element);
  };
});
