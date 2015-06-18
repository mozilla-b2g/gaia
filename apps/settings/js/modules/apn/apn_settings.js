/**
 * ApnSettings provides functions for manipulating the apn settings in the
 * settings database.
 * Implementation details please refer to {@link ApnSettings}.
 *
 * @module modules/apn/apn_settings
 */
define(function(require) {
  'use strict';

  var SettingsCache = require('modules/settings_cache');
  var ApnUtils = require('modules/apn/apn_utils');
  var ApnConst = require('modules/apn/apn_const');

  var APN_SETTINGS_KEY = ApnConst.APN_SETTINGS_KEY;
  var DEFAULT_APN_SETTINGS_KEY = ApnConst.DEFAULT_APN_SETTINGS_KEY;

  /**
   * @class ApnSettings
   * @returns {ApnSettings}
   */
  function ApnSettings() {
    this._isReady = false;
    this._readyPromise = null;
    this._isWritingDB = false;
    this._isDirty = false;
    this._apnSettings = null;
    this._promiseChain = Promise.resolve();
  }

  ApnSettings.prototype = {
    /**
     * As the operations should not be performed concurrently. We use this
     * function to enusre the operations are performed one by one.
     *
     * @access private
     * @memberOf ApnSettings.prototype
     * @param {Function} task
     * @returns {Promise}
     */
    _schedule: function al__schedule(task) {
      var that = this;
      this._promiseChain = this._promiseChain.then(function() {
        return task().then(function() {
          return that._commit();
        });
      });
      return this._promiseChain;
    },

    /**
     * Stores the current copy of apn settings to the settings database.
     *
     * @access private
     * @memberOf ApnSettings.prototype
     * @returns {Promise}
     */
    _commit: function al__commit() {
      if (!this._isDirty) {
        return Promise.resolve();
      }

      var that = this;
      return new Promise(function(resolve) {
        that._isWritingDB = true;
        var obj = {};
        obj[APN_SETTINGS_KEY] = that._apnSettings;
        var req = navigator.mozSettings.createLock().set(obj);
        req.onsuccess = req.onerror = function() {
          that._isDirty = false;
          that._isWritingDB = false;
          resolve();
        };
      });
    },

    /**
     * Registers an observer on setting changes because ril.data.apnSettings
     * could be changed by other apps (system and wap).
     *
     * @access private
     * @memberOf ApnSettings.prototype
     */
    _addObservers: function as__registerListeners() {
      var mozSettings = window.navigator.mozSettings;
      if (!mozSettings) {
        return;
      }
      mozSettings.addObserver(APN_SETTINGS_KEY, function(event) {
        if (!this._isWritingDB) {
          // Do not reflect the change during the committing.
          this._apnSettings = event.settingValue || [];
        }
      }.bind(this));
    },

    /**
     * Initializes the settings based on the values stored in the settings
     * database.
     *
     * @access private
     * @memberOf ApnSettings.prototype
     * @returns {Promise}
     */
    _ready: function as__ready() {
      if (this._isReady) {
        return Promise.resolve();
      } else {
        // This ensures that the ready process being executed only once.
        if (!this._readyPromise) {
          var that = this;
          this._readyPromise = new Promise(function(resolve) {
            SettingsCache.getSettings(function(results) {
              that._isReady = true;
              that._apnSettings = results[APN_SETTINGS_KEY] || [];
              that._addObservers();
              resolve();
            });
          });
        }
        return this._readyPromise;
      }
    },

    /**
     * The internal update function.
     *
     * @access private
     * @memberOf ApnSettings.prototype
     * @params {Number} serviceId
     * @params {String} apnType
     * @params {Object} newApn
     * @returns {Promise}
     */
    _update: function as__update(serviceId, apnType, newApn) {
      return this._ready().then(function() {
        var apns = this._apnSettings[serviceId];
        if (!apns) {
          apns = this._apnSettings[serviceId] = [];
        }

        var index = apns.findIndex(function(apn) {
          return apn.types.some((type) => apnType === type);
        });

        if (index === -1) {
          if (newApn) {
            this._isDirty = true;
            apns.push(newApn);
          }
        } else {
          if (newApn) {
            if (!ApnUtils.isMatchedApn(apns[index], newApn)) {
              this._isDirty = true;
              apns[index] = newApn;
            }
          } else {
            this._isDirty = true;
            apns.splice(index, 1);
          }
        }
      }.bind(this));
    },

    /**
     * Get all apns with of a sim card.
     *
     * @access public
     * @memberOf ApnSettings.prototype
     * @params {Number} serviceId
     * @returns {Promise.<Array>}
     */
    getAll: function as_getAll(serviceId) {
      return this._ready().then(function() {
        return this._apnSettings[serviceId];
      }.bind(this));
    },

    /**
     * Get the apn of the specified apn type.
     *
     * @access public
     * @memberOf ApnSettings.prototype
     * @params {Number} serviceId
     * @params {String} apnType
     * @returns {Promise.<Object>}
     */
    get: function as_get(serviceId, apnType) {
      return this._ready().then(function() {
        var apns = this._apnSettings[serviceId];
        if (apns) {
          return apns.find((apn) => apn.types.indexOf(apnType) >= 0);
        } else {
          return null;
        }
      }.bind(this));
    },

    /**
     * Update an apn and the change will be saved into the settings database.
     *
     * @access public
     * @memberOf ApnSettings.prototype
     * @params {Number} serviceId
     * @params {String} apnType
     * @params {Object} apn
     * @returns {Promise}
     */
    update: function as_update(serviceId, apnType, apn) {
      var apnClone = ApnUtils.clone(apn);
      return this._schedule(
        this._update.bind(this, serviceId, apnType, apnClone));
    },

    /**
     * Restore the apn settings to the default value determined in
     * system/js/operator_variants.js.
     *
     * @access public
     * @memberOf ApnSettings.prototype
     * @params {String} serviceId
     * @returns {Promise}
     */
    restore: function as_restore(serviceId) {
      var that = this;
      return this._ready().then(function() {
        return new Promise(function(resolve) {
          SettingsCache.getSettings(function(results) {
            resolve(results[DEFAULT_APN_SETTINGS_KEY] || []);
          });
        });
      }).then(function(defaultApnSettings) {
        return that._schedule(function() {
          that._isDirty = true;
          that._apnSettings[serviceId] = defaultApnSettings[serviceId];
          return Promise.resolve();
        });
      });
    }
  };

  return function ctor_apn_settings() {
    return new ApnSettings();
  };
});
