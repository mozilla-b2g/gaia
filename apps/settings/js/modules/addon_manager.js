define(function(require) {
  'use strict';

  var mozApps = require('modules/navigator/mozApps');
  var App = require('modules/app');
  var AppsCache = require('modules/apps_cache');
  var ObservableArray = require('modules/mvvm/observable_array');

  /**
   * AddonManager is a singleton with methods for querying the currently
   * installed addons, enabling, disabling, and uninstalling addons, and
   * for obtaining a list of apps targeted by a specified add-on. The changes to
   * installed addons are propagated via an observable array.
   *
   * AddonManager uses the AppsCache module for efficient access to the full
   * list of installed apps.
   *
   * @class AddonManager
   * @requires module:modules/navigator/mozApps
   * @requires module:modules/apps_cache
   * @requires module:modules/mvvm/observable_array
   * @returns {AddonManager}
   */
  function AddonManager() {
    this._addons = ObservableArray([]);
    this._bindEvents();

    AppsCache.apps().then((apps) => {
      apps.some((app) => {
        if (this._isAddon(app)) {
          this._addons.push(App(app));
        }
      });
    });
  }

  AddonManager.prototype = {
    /**
     * Bind to install and uninstall events.
     *
     * @access private
     * @memberOf AddonManager.prototype
     */
    _bindEvents: function() {
      AppsCache.addEventListener('oninstall', this._updateAddons.bind(this));
      AppsCache.addEventListener('onuninstall', this._updateAddons.bind(this));
      mozApps.mgmt.addEventListener('enabledstatechange',
        this._updateAddons.bind(this));
    },

    /**
     * We have to update the addon array based on incoming evt.
     *
     * @access private
     * @memberOf AddonManager.prototype
     * @param {Object} evt
     */
    _updateAddons: function(evt) {
      var app = evt && evt.application;
      var type = evt.type;
      var index;

      if (this._isAddon(app)) {
        if (type === 'install' && !this._alreadyExists(app)) {
          this._addons.push(App(app));
        } else if (type === 'uninstall') {
          index = this._findAddonIndex(app);
          if (index !== -1) {
            this._addons.splice(index, 1);
          }
        } else if (type === 'enabledstatechange') {
          index = this._findAddonIndex(app);
          if (index !== -1) {
            this._addons.get(index)._enabled = app.enabled;
          }
        }
      }
    },

    /**
     * Check if an addon already exists.
     *
     * @access private
     * @memberOf AddonManager.prototype
     * @param {DOMApplication} addon
     * @returns {Boolean}
     */
    _alreadyExists: function(addon) {
      return this._findAddonIndex(addon) !== -1;
    },

    /**
     * Get the index of an addon.
     *
     * @access private
     * @memberOf AddonManager.prototype
     * @param {DOMApplication} addon
     * @returns {Number}
     */
    _findAddonIndex: function(addon) {
      return this._addons.array.findIndex((elem) => {
        return addon.manifestURL === elem.instance.manifestURL;
      });
    },

    /**
     * Addons can only apply to apps with the same or lower privilege. Returns
     * a bloolean indicating whether the addon can be applied on the app.
     *
     * @access private
     * @memberOf AddonManager.prototype
     * @param {DOMApplication} addon
     * @param {DOMApplication} app
     * @returns {Boolean}
     */
    _privilegeCheck: function(addon, app) {
      var addonManifest = this._getManifest(addon);
      var appManifest = this._getManifest(app);
      return addonManifest.type === appManifest.type ||
        addonManifest.type === 'certified' ||
        (addonManifest.type === 'privileged' &&
         appManifest.type !== 'certified');
    },

    /**
     * Get the manifest.
     *
     * @access private
     * @memberOf AddonManager.prototype
     * @param {DOMApplication} app
     * @returns {Object}
     */
    _getManifest: function(app) {
      return app.manifest || app.updateManifest;
    },

    /**
     * Check whether reboot is required when disabling the addon.
     *
     * @access private
     * @memberOf AddonManager.prototype
     * @param {DOMApplication} app
     * @param {Array} customizations
     * @returns {Boolean}
     */
    _needsReboot: function({app, customizations}) {
      var manifest = this._getManifest(app);
      var role = manifest.role;
      // If the addon affects a system app
      if (role === 'system' || role === 'homescreen') {
        // and the app is customized with a script, then we need reboot
        return customizations.some(
          (c) => c.scripts.length > 0);
      } else {
        return false;
      }
    },

    /**
     * Check whether restart is required when disabling the addon.
     *
     * @access private
     * @memberOf AddonManager.prototype
     * @param {DOMApplication} app
     * @param {Array} customizations
     * @returns {Boolean}
     */
    _needsRestart: function({app, customizations}) {
      return customizations.some((c) => c.scripts.length > 0);
    },

    /**
     * Check whether this app is an addon.
     *
     * @access private
     * @memberOf AddonManager.prototype
     * @param {DOMApplication} app
     * @returns {Boolean}
     */
    _isAddon: function(app) {
      var manifest = this._getManifest(app);
      return manifest && manifest.role === 'addon';
    },

    /**
     * This internal utility function returns an array of objects describing
     * the aps that are affected by this addon. Each object in the array has
     * an 'app' property that holds the app object and an 'customizations'
     * property that is an array of customizations (from the addon manifest).
     * We implement getAddonTargets() using this information and also derive
     * the 'reboot' and 'restart' return values of disableAddon() from it.
     *
     * We need to keep this code in sync with the matching gecko
     * code in dom/apps/UserCustomizations.jsm so that our list of
     * targeted apps actually matches the apps that Gecko injects
     * the addon into.
     *
     * @access private
     * @memberOf AddonManager.prototype
     * @param {DOMApplication} addon
     * @returns {Boolean}
     */
    _getCustomizedApps: function(addon) {
      if (!this._isAddon(addon)) {
        return Promise.reject('not an addon');
      }

      var manifest = this._getManifest(addon);
      var customizations = manifest && manifest.customizations;

      // If the addon does not specify any customizations, then we know
      // that it does not target any apps
      if (!customizations || customizations.length === 0) {
        return Promise.resolve([]);
      }

      // Get a list of all installed apps
      return AppsCache.apps().then((apps) => {
        var customizedApps = []; // This is the array of we'll return

        // For each customization, compile the filter string into a regexp
        var filters = [];
        customizations.forEach(function(customization) {
          filters.push(new RegExp(customization.filter));
        });

        // Now loop through the apps and see which are affected by this addon
        apps.forEach((app) => {
          var manifest = this._getManifest(app);

          // Ignore apps that are themselves add-ons
          // XXX: Will themes have a role, and should we ignore them too?
          if (manifest.role === 'addon') {
            return;
          }

          // If the addon doesn't have high enough privileges to affect this app
          // then we can just return now.
          if (!this._privilegeCheck(addon, app)) {
            return;
          }

          // Get the URL of the app origin plus its launch path to
          // compare against each of the filters.
          // XXX: Note that we and do not check the paths used by
          // activity handlers or any other paths in the manifest.
          var launchPath = manifest.launch_path || '';
          var launchURL = new URL(launchPath, app.origin).href;
          var appliedCustomizations = [];

          // Now loop through the filters to see what customizations are
          // applied to this app
          for(var i = 0; i < filters.length; i++) {
            var filter = filters[i];
            if (filter.test(launchURL)) {
              appliedCustomizations.push(customizations[i]);
              break;
            }
          }

          // If any customizations were applied to this app, then add it
          // to the list of customizedApps
          if (appliedCustomizations.length > 0) {
            customizedApps.push({
              app: app,
              customizations: appliedCustomizations
            });
          }
        });

        return customizedApps;
      });
    },

    /**
     * Check whether an addon is enabled.
     *
     * @access public
     * @memberOf AddonManager.prototype
     * @param {App} addon
     * @returns {Boolean}
     */
    isEnabled: function(addon) {
      return this._isAddon(addon.instance) && addon.instance.enabled === true;
    },

    /**
     * Check whether an addon can be deleted.
     *
     * @access public
     * @memberOf AddonManager.prototype
     * @param {App} addon
     * @returns {Boolean}
     */
    canDelete: function(addon) {
      return this._isAddon(addon.instance) && addon.instance.removable === true;
    },

    /**
     * Enable an addon
     *
     * @access public
     * @memberOf AddonManager.prototype
     * @param {App} addon
     */
    enableAddon: function(addon) {
      if (this._isAddon(addon.instance) && !addon.instance.enabled) {
        mozApps.mgmt.setEnabled(addon.instance, true);
      }
    },

    /**
     * Disable an addon. Returns a string indicating whether reboot or restart
     * required for disabling the addon completely.
     *
     * @access public
     * @memberOf AddonManager.prototype
     * @param {App} addon
     */
    disableAddon: function(addon) {
      if (this._isAddon(addon.instance) && addon.instance.enabled) {
        mozApps.mgmt.setEnabled(addon.instance, false);
      }
    },

    /**
     * Delete an addon.
     *
     * @access public
     * @memberOf AddonManager.prototype
     * @param {App} addon
     * @returns {Promise}
     */
    deleteAddon: function(addon) {
      if (!this._isAddon(addon.instance)) {
        return Promise.reject('not an addon');
      }

      if (!addon.instance.removable) {
        return Promise.reject('addon is not deletable');
      }

      return new Promise(function(resolve, reject) {
        var request = mozApps.mgmt.uninstall(addon.instance);
        request.onsuccess = function() {
          resolve();
        };
        request.onerror = function() {
          reject();
        };
      });
    },

    /**
     * Share an addon.
     *
     * @access public
     * @memberOf AddonManager.prototype
     * @param {App} addon
     * @returns {Promise}
     */
    shareAddon: function(addon) {
      if (!this._isAddon(addon.instance)) {
        return Promise.reject('not an addon');
      }

      return new Promise(function(resolve, reject) {
        var activity = new window.MozActivity({
          name: 'share',
          data: {
            type: 'app',
            app: addon.instance.manifestURL
          }
        });

        activity.onsuccess = function() {
          resolve();
        };
        activity.onerror = function() {
          reject((activity.error && activity.error.name) || 'activity error');
        };
      });
    },

    /**
     * Return an array of the apps that are targeted by any of this
     * addon's customizations. Note, however, that addons can also target
     * arbitrary web pages and hosted apps. This test only applies to
     * installed packaged apps and so may be of limited utility.
     *
     * @access public
     * @memberOf AddonManager.prototype
     * @param {App} addon
     * @returns {Promise}
     */
    getAddonTargets: function(addon) {
      return this._getCustomizedApps(addon.instance).then((customizedApps) => {
        return customizedApps.map((x) => x.app);
      });
    },

    /**
     * Return a string indicating whether reboot or restart is required for
     * disabling the addon.
     *
     * @access public
     * @memberOf AddonManager.prototype
     * @param {App} addon
     * @returns {Promise String}
     */
    getAddonDisableType: function(addon) {
      return this._getCustomizedApps(addon.instance).then((customizedApps) => {
        var needsReboot = customizedApps.some(this._needsReboot.bind(this));
        if (needsReboot) {
          return 'reboot';
        }

        var needsRestart = customizedApps.some(this._needsRestart.bind(this));
        if (needsRestart) {
          return 'restart';
        }

        return '';
      });
    },

    get length() {
      return this._addons.length;
    },

    get addons() {
      return this._addons;
    }
  };

  return new AddonManager();
});
