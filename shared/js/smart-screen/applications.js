'use strict';
/* global evt, ManifestHelper */

(function(exports) {

  /**
   * Application Entry Point
   *
   * This object stands for an entry point of the app. There can be more than
   * one entry point in one app. Each entry point can own its name and icon, and
   * can be launched singly.
   *
   * @property {String} manifestURL The app's manifestURL.
   * @property {String} entryPoint The entry point defined in app's manifest.
   * @property {String} name The name of the entry.
   * @typedef {Object} AppEntryPoint
   */

  /**
   * Applications is a helper for mozApps.mgmt. It is responsible for:
   *
   * - get all installed apps
   * - get app icon blob
   * - listen to app install/update/uninstall events and publish them
   * - launch app
   *
   * @namespace Applications
   * @requires ManifestHelper
   */
  var Applications = evt({
    /**
     * App roles which we don't need to handle and monitor.
     *
     * @constant
     * @type {Array}
     * @memberof Applications
     */
    HIDDEN_ROLES: [
      'system', 'homescreen', 'input', 'deck', 'addon', 'langpack'
    ],

    /**
     * Default icon url.
     *
     * @constant
     * @type {String}
     * @memberof Applications
     */
    DEFAULT_ICON_URL: '/style/images/default.png',

    /**
     * Installed apps indexed by their "manifestURL".
     *
     * @readonly
     * @type {Object}
     * @memberof Applications
     */
    installedApps: {},

    _ready: false,
    _readyCallbacks: [],

    _isHiddenApp: function appIsHiddenApp(role) {
      if (!role) {
        return false;
      }
      return (this.HIDDEN_ROLES.indexOf(role) !== -1);
    },

    _loadIcon: function appLoadIcon(request) {
      if (!request.url) {
        if (request.onerror) {
          request.onerror();
        }
        return;
      }

      var xhr = new XMLHttpRequest({
        mozAnon: true,
        mozSystem: true
      });

      var icon = request.url;

      xhr.open('GET', icon, true);
      xhr.responseType = 'blob';

      xhr.onload = function onload(evt) {
        var status = xhr.status;

        if (status !== 0 && status !== 200) {
          if (request.onerror) {
            request.onerror();
          }
          return;
        }

        if (request.onsuccess) {
          request.onsuccess(xhr.response);
        }
      };

      xhr.ontimeout = xhr.onerror = function onerror(evt) {
        if (request.onerror) {
          request.onerror();
        }
      };

      try {
        xhr.send(null);
      } catch (evt) {
        if (request.onerror) {
          request.onerror();
        }
      }
    },

    _bestMatchingIcon:
    function appBestMatchingIcon(app, manifest, preferredSize) {
      preferredSize = preferredSize || Number.MAX_VALUE;

      var max = 0;
      var closestSize = 0;

      for (var size in manifest.icons) {
        size = parseInt(size, 10);
        if (size > max) {
          max = size;
        }
        if (!closestSize && size >= preferredSize) {
          closestSize = size;
        }
      }

      if (! closestSize) {
        closestSize = max;
      }

      var url = manifest.icons[closestSize];
      if (!url) {
        return;
      }
      if (url.indexOf('data:') === 0 ||
          url.indexOf('app://') === 0 ||
          url.indexOf('http://') === 0 ||
          url.indexOf('https://') === 0) {
        return url;
      }
      if (url.charAt(0) != '/') {
        console.warn('`' + manifest.name + '` app icon is invalid. ' +
                     'Manifest `icons` attribute should contain URLs -or- ' +
                     'absolute paths from the origin field.');
        return '';
      }

      if (app.origin.slice(-1) === '/') {
        return app.origin.slice(0, -1) + url;
      }

      return app.origin + url;
    },

    /**
     * An easy way to register callback functions for "ready" event.
     *
     * Use this method to initialize your code if it depends on Applications. It
     * will be triggered immediately if Applications is already ready.
     *
     * @param {Function} callback This function will be called when initialized.
     * @memberof Applications
     */
    ready: function appReady(callback) {
      if (this._ready) {
        window.setTimeout(callback);
      } else {
        this._readyCallbacks.push(callback);
      }
    },

    onAppInstall: function onAppInstall(evt) {
      var app = evt.application;
      var manifest = app.manifest || app.updateManifest;

      if (!app.launch || !manifest || !manifest.icons ||
          this._isHiddenApp(manifest.role)) {
        return;
      }

      var message =
        this.installedApps[app.manifestURL] ? 'update' : 'install';
      this.installedApps[app.manifestURL] = app;
      this.fire(message, this.getAppEntries(app.manifestURL));
    },

    onAppUninstall: function onAppUninstall(evt) {
      var app = evt.application;
      if (this.installedApps[app.manifestURL]) {
        this.fire('uninstall', this.getAppEntries(app.manifestURL));
        delete this.installedApps[app.manifestURL];
      }
    },

    /**
     * Initialize Applications.
     *
     * The callback functions registered by "ready" method will be triggered
     * after it's done.
     *
     * @param {Function} callback This function will be called when "init" is
     *                            done.
     * @memberof Applications
     */
    init: function appInit(callback) {
      var appMgmt = navigator.mozApps.mgmt;
      var self = this;

      appMgmt.getAll().onsuccess = function onsuccess(event) {
        event.target.result.forEach(function eachApp(app) {
          var manifest = app.manifest;
          if (!app.launch || !manifest || !manifest.icons ||
              self._isHiddenApp(manifest.role)) {
            return;
          }
          self.installedApps[app.manifestURL] = app;
        });

        self._ready = true;

        if (callback) {
          callback();
        }

        while (self._readyCallbacks.length) {
          setTimeout(self._readyCallbacks.shift());
        }
      };

      appMgmt.addEventListener('install', this);
      appMgmt.addEventListener('uninstall', this);
    },

    /**
     * Release all resources.
     *
     * @memberof Applications
     */
    uninit: function appUninit() {
      var appMgmt = navigator.mozApps.mgmt;
      appMgmt.oninstall = null;
      appMgmt.onuninstall = null;

      this.installedApps = {};
      this._ready = false;
      this._readyCallbacks = [];
    },

    /* jshint -W004 */
    // XXX: Uses this to prevent 'helper' is already defined jshint error
    /**
     * Get all "entry_point"s from the specified app.
     *
     * @param {String} manifestURL The app's manifestURL.
     * @return {Array} An array contains all {@link AppEntryPoint} of the
     *                 specified app.
     * @memberof Applications
     */
    getAppEntries: function appGetAppEntries(manifestURL) {
      if (!manifestURL || !this.installedApps[manifestURL]) {
        return [];
      }

      var manifest = this.installedApps[manifestURL].manifest ||
        this.installedApps[manifestURL].updateManifest;
      var entryPoints = manifest.entry_points;
      var entries = [];
      var removable = this.installedApps[manifestURL].removable;

      if (!entryPoints || manifest.type !== 'certified') {
        var helper = new ManifestHelper(manifest);
        entries.push({
          manifestURL: manifestURL,
          entryPoint: '',
          name: helper.name,
          removable: removable
        });
      } else {
        for (var entryPoint in entryPoints) {
          if (entryPoints[entryPoint].icons) {
            var helper = new ManifestHelper(entryPoints[entryPoint]);
            entries.push({
              manifestURL: manifestURL,
              entryPoint: entryPoint,
              name: helper.name,
              removable: removable
            });
          }
        }
      }

      return entries;
    },
    /* jshint +W004 */

    /**
     * Get all "entry_point"s from all installed apps.
     *
     * @return {Array} An array contains all {@link AppEntryPoint} of the
     *                 installed apps.
     * @memberof Applications
     */
    getAllAppEntries: function appGetAllAppEntries() {
      if (!this._ready) {
        return null;
      }

      var entries = [];
      for (var manifestURL in this.installedApps) {
        entries.push.apply(entries, this.getAppEntries(manifestURL));
      }
      return entries;
    },

    /**
     * Launch an app by its manifestURL and entryPoint.
     *
     * @param {String} manifestURL The app's manifestURL.
     * @param {String} [entryPoint] The specific "entry_point" you want to
     *                              launch. Default launch path will be involved
     *                              if it's omitted.
     * @return {Boolean} true if succeed.
     * @memberof Applications
     */
    launch: function appLaunch(manifestURL, entryPoint) {
      var installedApps = this.installedApps;

      if (!manifestURL || !installedApps[manifestURL] ||
          !installedApps[manifestURL].launch) {
        return false;
      }

      entryPoint = entryPoint || '';
      installedApps[manifestURL].launch(entryPoint);

      return true;
    },

    /**
     * Get manifest object by specified manifestURL and entryPoint.
     *
     * @param {String} manifestURL The app's manifestURL.
     * @param {String} [entryPoint] Specify an "entry_point" if you want to get
     *                              its part only. Otherwise, the whole manifest
     *                              object will be returned.
     * @return {Object} A manifest object or "null" if the app doesn't exist.
     * @memberof Applications
     */
    getEntryManifest: function appGetEntryManifest(manifestURL, entryPoint) {
      if (!manifestURL || !this.installedApps[manifestURL]) {
        return null;
      }

      var manifest = this.installedApps[manifestURL].manifest ||
        this.installedApps[manifestURL].updateManifest;

      if (entryPoint) {
        var entry_manifest = manifest.entry_points[entryPoint];
        return entry_manifest || null;
      }

      return manifest;
    },

    /**
     * Get app/entry's name.
     *
     * @param {String} manifestURL An app's manifestURL.
     * @param {String} [entryPoint] Specify an "entry_point" if you want to get
     *                              its part only. Otherwise, the default name
     *                              will be returned.
     * @return {String} The app/entry's name or empty string if the app doesn't
     *                  exist.
     * @memberof Applications
     */
    getName: function appGetName(manifestURL, entryPoint) {
      var entry_manifest = this.getEntryManifest(manifestURL, entryPoint);
      if (!entry_manifest) {
        return '';
      }
      return new ManifestHelper(entry_manifest).name;
    },

    /**
     * Get blob data of the app/entry's icon.
     *
     * @param {String} manifestURL An app's manifestURL.
     * @param {String} [entryPoint] Specify an "entry_point".
     * @param {Number} [preferredSize=Number.MAX_VALUE]
     *        In pixels. This method will choose the smallest icon that its
     *        width greater than this value or the biggest one if all the icons'
     *        width are smaller than this value.
     * @param {Function} [callback] The callback will contains blob data as the
     *                            first argument if succeed or "undefined" if
     *                            something failed.
     * @return {Boolean} true if the process is started or false if no valid
     *                   icon url can be found or the app doesn't exist.
     * @memberof Applications
     */
    getIconBlob: function appGetIconBlob(manifestURL, entryPoint, preferredSize,
                                                                     callback) {
      var entry_manifest = this.getEntryManifest(manifestURL, entryPoint);
      if (! entry_manifest) {
        return false;
      }

      var url = this._bestMatchingIcon(
        this.installedApps[manifestURL], entry_manifest, preferredSize);

      if (!url) {
        if (callback) {
          setTimeout(callback);
        }
        return true;
      }

      this._loadIcon({
        url: url,
        onsuccess: function(blob) {
          if (callback) {
            callback(blob);
          }
        },
        onerror: function() {
          if (callback) {
            callback();
          }
        }
      });

      return true;
    },

    listAppsByRole: function listAppsByRole(role) {
      var matched = [];
      for (var manifestURL in this.installedApps) {
        var app = this.installedApps[manifestURL];
        if (!role || app.manifest.role === role) {
          matched.push({
            'manifestURL': manifestURL,
            'app': app
          });
        }
      }
      return matched;
    },

    handleEvent: function handleEvent(evt) {
      switch(evt.type) {
        case 'install':
          this.onAppInstall(evt);
          break;
        case 'uninstall':
          this.onAppUninstall(evt);
          break;
      }
    }
  });

  exports.Applications = Applications;
})(window);
