/**
 * AppsCache is a singleton that will encapsulate mozApps.mgmt inside and
 * expose neede API to callers. The reason why we need this is because
 * mozApps.mgmt.getAll() costs a lot and the better way to do so is cache
 * them inside this AppManager and automatically update it when install /
 * uninstall event is received.
 *
 * API:
 *
 * AppsCache.apps().then(function(apps) {
 *   // installed apps in FxOS
 * });
 *
 * @module AppsCache
 */
define(function(require) {
  'use strict';

  var mozApps = window.navigator.mozApps;
  var mozAppsMgmt = mozApps && mozApps.mgmt;

  var AppsCache = function() {
    this._initPromise = null;
    this._apps = [];
    this._eventHandlers = {};
    this._eventHandlers.oninstall = [];
    this._eventHandlers.onuninstall = [];
  };

  AppsCache.prototype = {
    /**
     * apps is a method that would return a promise that would return
     * cached apps.
     *
     * @access public
     * @memberOf AppsCache
     * @return {Promise}
     */
    apps: function am_apps() {
      var self = this;
      return this._init().then(function() {
        return self._apps;
      });
    },

    /**
     * Entry point
     *
     * @access private
     * @memberOf AppsCache
     * @return {Promise}
     */
    _init: function am__init() {
      var self = this;
      if (!this._initPromise) {
        this._initPromise = this._initApps().then(function() {
          self._initEvents();
        });
      }
      return this._initPromise;
    },

    /**
     * Init needed events
     *
     * @access private
     * @memberOf AppsCache
     */
    _initEvents: function am__initEvents() {
      var self = this;

      mozAppsMgmt.oninstall = function(evt) {
        var newApp = evt.application;
        var existing = false;
        self._apps.some((app, i) => {
          if (app.manifestURL === newApp.manifestURL) {
            self._apps[i] = newApp;
            existing = true;
            return true;
          }
        });

        if (!existing) {
          self._apps.push(newApp);
        }
        self._eventHandlers.oninstall.forEach(function(eventHandler) {
          eventHandler(evt);
        });
      };

      mozAppsMgmt.onuninstall = function(evt) {
        var manifestURL = evt.application.manifestURL;
        var appRemoved = false;
        self._apps = self._apps.filter(app => {
          if (app.manifestURL === manifestURL) {
            appRemoved = true;
            return false;
          }
          return true;
        });

        if (appRemoved) {
          self._eventHandlers.onuninstall.forEach(function(eventHandler) {
            eventHandler(evt);
          });
        }
      };
    },

    /**
     * Init apps
     *
     * @access private
     * @memberOf AppsCache
     */
    _initApps: function am__initApps() {
      var self = this;
      var promise = new Promise(function(resolve, reject) {
        var req = mozAppsMgmt.getAll();
        req.onsuccess = function success(evt) {
          self._apps = evt.target.result;
          resolve(self._apps);
        };
        req.onerror = function error(evt) {
          console.log('failed to get installed apps');
          reject(req.error);
        };
      });
      return promise;
    },

    /**
     * Caller can add events when app is installed/uninstalled
     *
     * @access public
     * @param {String} eventName
     * @param {Function} callback
     * @memberOf AppsCache
     */
    addEventListener: function am_addEventListener(eventName, callback) {
      if (this._eventHandlers[eventName]) {
        this._eventHandlers[eventName].push(callback);
      }
    },

    /**
     * Caller can remove events when app is installed/uninstalled
     *
     * @access public
     * @param {String} eventName
     * @param {Function} callback
     * @memberOf AppsCache
     */
    removeEventListener: function am_removeEventListener(eventName, callback) {
      if (this._eventHandlers[eventName]) {
        var index = this._eventHandlers[eventName].indexOf(callback);
        if (index >= 0) {
          this._eventHandlers[eventName].splice(index, 1);
        }
      }
    },
  };

  var appsCache = new AppsCache();
  return appsCache;
});
