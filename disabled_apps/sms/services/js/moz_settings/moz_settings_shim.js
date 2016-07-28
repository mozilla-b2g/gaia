/* global BridgeServiceMixin */

/* exported MozSettingsShim */

(function(exports) {
'use strict';

/**
 * Name of the service for mozSettings API shim.
 * @type {string}
 */
const SERVICE_NAME = 'moz-settings-shim';

/**
 * Array of method names that need to be exposed for API shim.
 * @type {Array.<string>}
 */
const METHODS = Object.freeze(['get', 'set']);

var mozSettings = null;

var MozSettingsShim = {
  init(settings) {
    if (!settings) {
      console.error('Invalid settings for shim initialization');
      return;
    }
    mozSettings = settings;

    this.initService();
  },

  /* Methods */

  /**
   * Shim for mozSettings.createLock().get API.
   * @param {String} key Key name for Settings.
   * @returns {Promise} Promise that return the settings value from settings DB.
   */
  get(key) {
    return mozSettings.createLock().get(key);
  },

  /**
   * Shim for mozSettings.createLock().set API.
   * @param {Object} settings Settings key and value for settings. It can have
   *  several key/value pairs inside.
   * @returns {Promise} Promise that return saved result.
   */
  set(settings) {
    return mozSettings.createLock().set(settings);
  }
};

exports.MozSettingsShim = Object.seal(
  BridgeServiceMixin.mixin(MozSettingsShim, SERVICE_NAME, { methods: METHODS })
);

}(this));
