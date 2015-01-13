/**
 * Handle addons panel's functionality.
 *
 * @module AddonsManager
 */
define(function(require) {
  'use strict';

  var AppsCache = require('modules/apps_cache');
  var ObservableArray = require('modules/mvvm/observable_array');

  function AddonsManager() {
    this.addons = {};
  }

  AddonsManager.prototype = {
    /**
     * initialization
     *
     * @memberOf AddonsManager
     * @access public
     */
    init: function am_init() {
      this.addons = ObservableArray([]);
      return AppsCache.apps().then((apps) => {
        apps.some((app) => {
          if (this._isAddon(app)) {
            this.addons.push(app);
          }
        });
      });
    },

    set enabled(value) {
      if (value !== this._enabled) {
        this._enabled = value;
        if (this._enabled) {
          this._bindEvents();
        } else {
          this._unbindEvents();
        }
      }
    },

    _bindEvents: function am__bindEvents() {
      AppsCache.addEventListener('oninstall', this._updateAddons.bind(this));
      AppsCache.addEventListener('onuninstall', this._updateAddons.bind(this));
    },

    _unbindEvents: function am__unbindEvents() {
      AppsCache.removeEventListener('oninstall', this._updateAddons);
      AppsCache.removeEventListener('onuninstall', this._updateAddons);
    },

    /**
     * We have to update the addon count based on incoming evt and
     * decide to show/hide or not.
     *
     * @param {Object} evt
     * @memberOf AddonsManager
     */
    _updateAddons: function(evt) {
      var app = evt && evt.application;
      var type = evt.type;

      if (this._isAddon(app)) {
        if (type === 'install' && !this._alreadyExists(app)) {
          this.addons.push(app);
        } else if (type === 'uninstall') {
          var index = this._findAddon(app);
          if (index !== -1) {
            this.addons.splice(index, 1);  
          }
        }
      }
    },

    _alreadyExists: function(app) {
      return this._findAddonIndex(app) !== -1;
    },

    _findAddonIndex: function(app) {
      return this.addons.array.findIndex((elem) => {
        return app.manifestURL === elem.manifestURL;
      });
    },

    /**
     * Check whether this app is an addon
     *
     * @param {Object} app
     * @returns {Boolean}
     * @memberOf AddonsManager
     */
    _isAddon: function(app) {
      var manifest = app.manifest || app.updateManifest;
      return manifest.role === 'addon';
    },

    enableAddon: function(app) {
      navigator.mozApps.mgmt.setEnabled(app, true);
    },

    disableAddon: function(app) {
      navigator.mozApps.mgmt.setEnabled(app, false);
    },

    get length() {
      return this.addons.length;
    }

  };

  return function ctor_addons_manager() {
    return new AddonsManager();
  };
});
