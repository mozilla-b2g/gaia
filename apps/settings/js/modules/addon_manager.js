/* global MatchPattern */

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
      var _boundUpdateAddons = this._updateAddons.bind(this);
      // Bug 1215546 & 1218298
      // The 'oninstall' event is fired when user started installing the
      // app, but manifest is not available yet. In order to get the
      // manifest, we need to listen to 'downloadsuccess' on the app
      // (not mozApps.mgmt), and that's when manifest will be ready.
      AppsCache.addEventListener('oninstall', (evt) => {
        evt.application.addEventListener('downloadsuccess', _boundUpdateAddons);
      });
      AppsCache.addEventListener('onuninstall', _boundUpdateAddons);
      mozApps.mgmt.addEventListener('enabledstatechange', _boundUpdateAddons);
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
        if (type === 'downloadsuccess' && !this._alreadyExists(app)) {
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
        addonManifest.type === 'privileged';
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
     * @param {Array} contentScripts
     * @returns {Boolean}
     */
    _needsReboot: function({app, contentScripts}) {
      var manifest = this._getManifest(app);
      var role = manifest.role;
      // If the addon affects a system app
      if (role === 'system' || role === 'homescreen') {
        // and the app is customized with a script, then we need reboot
        return contentScripts.some(c => c.js.length > 0);
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
     * @param {Array} contentScripts
     * @returns {Boolean}
     */
    _needsRestart: function({app, contentScripts}) {
      return contentScripts.some(c => c.js.length > 0);
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
     * Get content scripts from add-on manifest that specify JavaScript and CSS
     * to be injected into matching apps.
     *
     * NOTE: content_sctipts is not present in the add-on's .manifest file and
     * instead is stored in {add-on origin}/manifest.json that needs to be
     * individually fetched.
     *
     * @param  {DOMApplication} addon Add-on to get content scripts for.
     * @return {Promse} content_sctipts JSON object promise.
     */
    _getContentScripts: function(addon) {
      var url = addon.origin + '/manifest.json';
      var xhr = new XMLHttpRequest({ mozSystem: true });
      xhr.open('GET', url);
      xhr.responseType = 'json';

      return new Promise(function(resolve, reject) {
        xhr.onload = () => {
          var contentScripts = xhr.response && xhr.response.content_scripts;
          if (contentScripts && contentScripts.length > 0) {
            resolve(contentScripts);
          } else {
            reject();
          }
        };
        xhr.onerror = reject;
        xhr.send();
      });
    },

    /**
     * This internal utility function returns an array of objects describing
     * the apps that are affected by the given addon.
     *
     * @access private
     * @memberOf AddonManager.prototype
     * @param {DOMApplication} addon
     * @returns {Boolean}
     */
    _getAffectedApps: function(addon) {
      if (!this._isAddon(addon)) {
        return Promise.reject('not an addon');
      }

      var manifest = this._getManifest(addon);
      var customizations = manifest && manifest.customizations;

      // If the addon specifies customizations, then it is obsolete and does not
      // work
      if (customizations) {
        return Promise.resolve([]);
      }

      var matched;
      return this._getContentScripts(addon)
        // If add-on has content scripts specified, fetch all apps that it can
        // possibly affect
        .then(contentScripts => Promise.all([
          contentScripts,
          AppsCache.apps().then(apps => apps.filter(app => {
            var manifest = this._getManifest(app);
            // Ignore apps that are themselves add-ons or if the addon doesn't
            // have high enough privileges to affect this app then we can just
            // return now.
            return manifest.role !== 'addon' &&
              this._privilegeCheck(addon, app);
          }))
        ]))
        // Match apps based on add-on's content sctipts.
        .then(([contentScripts, apps]) =>
          [for (app of apps)
            if (matched = this._matchContentScripts(contentScripts, app)) {
              app: app,
              contentScripts: matched
            }
          ])
        .catch(() => []);
    },

    /**
     * Returns a list of content scripts (from an addon manifest), if available,
     * that affect the app by a given addon. We implement getAddonTargets()
     * using this information , derive the 'reboot' and 'restart' return
     * values of disableAddon() from it and also use this function to apply
     * addon filters.
     *
     * @access private
     * @memberOf AddonManager.prototype
     * @param {DOMApplication} addon
     * @param {DOMApplication} app
     * @returns {Array?} appliedContentScripts if available
     */
    _matchContentScripts: function(contentScripts, app) {
      var manifest = this._getManifest(app);
      // Get the URL of the app origin plus its launch path to
      // compare against each of the filters.
      // XXX: Note that we and do not check the paths used by
      // activity handlers or any other paths in the manifest.
      var launchPath = manifest.launch_path || '';
      var launchURL = new URL(launchPath, app.origin);

      // For each content script, compile the pattern string MatchPattern
      var patterns = contentScripts.map(contentScript => {
        return {
          matches: new MatchPattern(contentScript.matches),
          excludeMatches: new MatchPattern(contentScript.exclude_matches)
        };
      });

      var appliedContentScripts = [];

      // Now loop through the patterns to see what content scripts are applied
      // to this app
      for(var i = 0; i < patterns.length; i++) {
        var pattern = patterns[i];
        if (!pattern.excludeMatches.matches(launchURL) &&
             pattern.matches.matches(launchURL)) {
          appliedContentScripts.push(contentScripts[i]);
          break;
        }
      }

      // If any content scripts were applied to this app, return the list of
      // appliedContentScripts
      if (appliedContentScripts.length > 0) {
        return appliedContentScripts;
      }
    },

    /**
     * Convert exported add-on into an Array Buffer.
     *
     * @access private
     * @memberOf AddonManager.prototype
     * @param {Blob} blob
     * @returns {Promise}
     */
    _blobToArrayBuffer: function(blob) {
      return new Promise(function(resolve, reject) {
        var fileReader = new FileReader();
        fileReader.onload = function() {
          resolve(fileReader.result);
        };
        fileReader.onerror = function(reason) {
          reject(reason);
        };
        fileReader.readAsArrayBuffer(blob);
      });
    },

    /**
     * Upack an add-on script.
     *
     * @access private
     * @memberOf AddonManager.prototype
     * @param {ArrayBuffer} arrayBuffer
     * @returns {Promise}
     */
    _unpackScript: function(arrayBuffer) {
      return this._JSZip.then(JSZip => {
        var zip = new JSZip();
        zip.load(arrayBuffer);

        var applicationZipFile = zip.file('application.zip');
        if (!applicationZipFile) { return; }

        var applicationZip = new JSZip();
        applicationZip.load(applicationZipFile.asArrayBuffer());

        var scriptFile = applicationZip.file('main.js');
        if (!scriptFile) { return; }

        return(scriptFile.asText());
      });
    },

    /**
     * Generate a new add-on.
     *
     * @access private
     * @memberOf AddonManager.prototype
     * @param {JSON} manifest add-on manifest
     * @param {String} script add-on script
     * @returns {Promise}
     */
    _generate: function(manifest, script) {
      return this._JSZip.then(JSZip => {
        var id = 'addon' + Math.round(Math.random() * 100000000);
        var applicationZip = new JSZip();

        // Ensure that we are creating an addon with a new id.
        manifest.role = 'addon';
        manifest.type = 'certified';
        manifest.origin = 'app://' + id + '.gaiamobile.org';
        manifest.activities = manifest.activities || {};

        applicationZip.file('manifest.webapp', JSON.stringify(manifest));
        applicationZip.file('main.js', script);

        var packageZip = new JSZip();
        packageZip.file('metadata.json', JSON.stringify({
          installOrigin: 'http://gaiamobile.org',
          manifestURL: 'app://' + id + '.gaiamobile.org/update.webapp',
          version: 1
        }));
        packageZip.file('update.webapp', JSON.stringify({
          name: manifest.name,
          package_path: '/application.zip'
        }));
        packageZip.file('application.zip',
          applicationZip.generate({ type: 'arraybuffer' }));

        return new Blob([packageZip.generate({ type: 'arraybuffer' })],
          { type: 'application/zip' });
      });
    },

    /**
     * Lazily require jszip. It is currently used only for renaming Add-ons.
     *
     * @access private
     * @memberOf AddonManager.prototype
     * @returns {Promise}
     */
    get _JSZip() {
      return new Promise(resolve => { require(['vendor/jszip'], resolve); });
    },

    /**
     * Install add-on, but importing it using a memory-backed blob.
     *
     * @access private
     * @memberOf AddonManager.prototype
     * @param {Blob} blob add-on blob
     * @returns {Promise}
     */
    _install: function(blob) {
      return navigator.mozApps.mgmt.import(blob).then(addon => {
        // Enable the addon by default.
        var app = { instance: addon };
        this.enableAddon(app);
        return app;
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
     * Rename an addon.
     *
     * @access public
     * @memberOf AddonManager.prototype
     * @param {App} addon
     * @param {String} name addon name
     * @returns {Promise}
     */
    renameAddon: function(addon, name) {
      if (!name) {
        return Promise.reject('no name given');
      }

      if (!this._isAddon(addon.instance)) {
        return Promise.reject('not an addon');
      }

      var manifest = this._getManifest(addon.instance);
      if (name === manifest.name) {
        return Promise.reject('name is unchanged');
      }

      var newManifest, addonBlob;
      // To rename an addon we are creating a new DOMApplication that will have
      // an updated name. Other manifest attributes are preserved.
      // Export an add-on as a blob.
      return addon.instance.export().then(blob => {
        addonBlob = blob;
        // Copy over manifest object.
        newManifest = Object.assign({}, manifest);
        newManifest.name = name;
        // Delete original add-on.
        return this.deleteAddon(addon);
      }).then(() => {
        // Convert exported add-on into an Array Buffer.
        return this._blobToArrayBuffer(addonBlob);
      }).then(this._unpackScript.bind(this)).then(script => {
        // Generate a new add-on using the original manifest and a new name.
        return this._generate(newManifest, script);
      }).then(this._install.bind(this));
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
     * addon's content scripts. Note, however, that addons can also target
     * arbitrary web pages and hosted apps. This test only applies to
     * installed packaged apps and so may be of limited utility.
     *
     * @access public
     * @memberOf AddonManager.prototype
     * @param {App} addon
     * @returns {Promise}
     */
    getAddonTargets: function(addon) {
      return this._getAffectedApps(addon.instance).then((affectedApps) => {
        return affectedApps.map((x) => x.app);
      });
    },

    /**
     * Return a string indicating whether reboot or restart is required for
     * disabling the addon.
     *
     * @access public
     * @memberOf AddonManager.prototype
     * @param {App} addon
     * @returns {Promise.<String>}
     */
    getAddonDisableType: function(addon) {
      return this._getAffectedApps(addon.instance).then((affectedApps) => {
        var needsReboot = affectedApps.some(this._needsReboot.bind(this));
        if (needsReboot) {
          return 'reboot';
        }

        var needsRestart = affectedApps.some(this._needsRestart.bind(this));
        if (needsRestart) {
          return 'restart';
        }

        return '';
      });
    },

    /**
     * Return the App object that matches the given manifest url.
     *
     * @access public
     * @memberOf AddonManager.prototype
     * @param {String} manifestURL
     * @returns {Promise.<App>}
     */
    findAddonByManifestURL: function(manifestURL) {
      return AppsCache.apps().then(() => {
        return this._addons.array.find((addon) => {
          return addon.instance.manifestURL === manifestURL;
        });
      });
    },

    /**
     * Returns a promise for a boolean flag indicating whether an addon affects
     * an application or not..
     *
     * @access public
     * @memberOf AddonManager.prototype
     * @param {DOMApplication} addon addon to check
     * @param {String} manifestURL app manifest URL to check
     * @returns {Promise.<Boolean>}
     */
    addonAffectsApp: function(addon, manifestURL) {
      if (!manifestURL) {
        return Promise.reject('No manifestURL given for an app');
      }
      if (!this._isAddon(addon.instance)) {
        return Promise.reject('not an addon');
      }

      var manifest = this._getManifest(addon.instance);
      var customizations = manifest && manifest.customizations;

      // If the addon specifies customizations, then it is obsolete and does not
      // work
      if (customizations) {
        return Promise.resolve(false);
      }

      return this._getContentScripts(addon.instance)
        .then(contentScripts => Promise.all([
          contentScripts,
          AppsCache.apps().then(
            apps => apps.find(app => app.manifestURL === manifestURL))
        ]))
        .then(([contentScripts, app]) => app ?
          this._matchContentScripts(contentScripts, app) : undefined)
        .then(customizations => !!customizations)
        .catch(() => false);
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
