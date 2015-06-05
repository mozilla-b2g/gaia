/**
 * Hotspot is a singleton that you can easily use it to fetch
 * some shared data across different panels
 *
 * @module Hotspot
 */
define(function(require) {
  'use strict';

  // modules / helpers
  var SettingsListener = require('shared/settings_listener');

  const RE_ENABLE_WIFI_TETHERING_TIME = 1000;

  var Hotspot = function() {
    this._settings = navigator.mozSettings;
  };

  /**
   * @alias module:hotspot/hotspot
   * @requires module:hotspot/hotspot_settings
   * @returns {Hotspot}
   */
  Hotspot.prototype = {
    /**
     * Wifi hotspot setting
     *
     * @memberOf Hotspot
     * @type {Boolean}
     */
    _hotspotSetting: null,
    /**
     * Usb hotspot setting
     *
     * @memberOf Hotspot
     * @type {Boolean}
     */
    _usbHotspotSetting: null,
    /**
     * Usb storage setting
     *
     * @memberOf Hotspot
     * @type {Boolean}
     */
    _usbStorageSetting: null,
    /**
     * These listeners would be called when hotspot setting is changed
     *
     * @memberOf Hotspot
     * @type {Array}
     */
    _hotspotChangeListeners: [],

    /**
     * These listeners would be called when usb hotspot setting is changed
     *
     * @memberOf Hotspot
     * @type {Array}
     */
    _usbHotspotChangeListeners: [],

    /**
     * These listeners would be called when usb storage setting is changed
     *
     * @memberOf Hotspot
     * @type {Array}
     */
    _usbStorageChangeListeners: [],

    /**
     * These listeners would be called when incompatibles settings are
     * enabled at the same time
     *
     * @memberOf Hotspot
     * @type {Array}
     */
    _incompatibleSettingsListeners: [],

    /**
     * Wifi tethering setting key
     *
     * @access public
     * @memberOf Hotspot
     * @type {String}
     */
    tetheringWifiKey: 'tethering.wifi.enabled',

    /**
     * Usb tethering setting key
     *
     * @access public
     * @memberOf Hotspot
     * @type {String}
     */
    tetheringUsbKey: 'tethering.usb.enabled',

    /**
     * Usb storage setting key
     *
     * @access public
     * @memberOf Hotspot
     * @type {String}
     */
    usbStorageKey: 'ums.enabled',

    /**
     * Init is used to initialize some basic stuffs
     *
     * @memberOf Hotspot
     */
    init: function h_init() {
      this._bindEvents();
    },

    /**
     * We will bind some default listeners here
     *
     * @memberOf Hotspot
     */
    _bindEvents: function() {
      // Wifi tethering enabled
      SettingsListener.observe(this.tetheringWifiKey, false,
        this._hotspotSettingChange.bind(this));

      // USB tethering enabled
      SettingsListener.observe(this.tetheringUsbKey, false,
        this._usbHotspotSettingChange.bind(this));

      // USB storage enabled
      SettingsListener.observe(this.usbStorageKey, false,
        this._usbStorageSettingChange.bind(this));
    },

    /**
     * When wifi hotspot is changed, we will call all registered listeners
     *
     * @memberOf Hotspot
     */
    _hotspotSettingChange: function(enabled) {
      this._hotspotSetting = enabled;
      this._hotspotChangeListeners.forEach(function(listener) {
        listener(enabled);
      });
    },

    /**
     * When usb hotspot is changed, we will call all registered listeners
     *
     * @memberOf Hotspot
     */
    _usbHotspotSettingChange: function(enabled) {
      this._usbHotspotSetting = enabled;
      this._usbHotspotChangeListeners.forEach(function(listener) {
        listener(enabled);
      });
    },

    /**
     * When usb storage is changed, we will call all registered listeners
     *
     * @memberOf Hotspot
     */
    _usbStorageSettingChange: function(enabled) {
      this._usbStorageSetting = enabled;
      this._usbStorageChangeListeners.forEach(function(listener) {
        listener(enabled);
      });
    },

    /**
     * When two incompatible settings are enabled we will call all
     * registered listeners.
     *
     * @param bothConflicts Indicates that usb hotspot has the two
     * possible conflicts (wifi hotspot and usb storage)
     *
     * @memberOf Hotspot
     */
    _incompatibleSettings: function(newSetting, oldSetting, bothConflicts) {
      this._incompatibleSettingsListeners.forEach(function(listener) {
        listener(newSetting, oldSetting, bothConflicts);
      });
    },

    /**
     * Check if two incompatible settings are enabled
     *
     * @memberOf Hotspot
     */
    checkIncompatibleSettings: function(newSetting, value) {
      switch(newSetting) {
        case this.tetheringWifiKey:
          // Early return if the user has disabled the setting
          if (!value) {
            this._setWifiTetheringSetting(value);
            return;
          }

          if (value && this._usbHotspotSetting) {
            this._incompatibleSettings(this.tetheringWifiKey,
              this.tetheringUsbKey, false);
          } else {
            this._setWifiTetheringSetting(value);
          }
          break;
        case this.tetheringUsbKey:
          // Early return if the user has disabled the setting or the
          // incompatible settings are disabled
          if (!value || (!this._hotspotSetting && !this._usbStorageSetting)) {
            this._setUsbTetheringSetting(value);
            return;
          }
          if (this._usbStorageSetting && this._hotspotSetting) {
            this._incompatibleSettings(this.tetheringUsbKey, null, true);
          } else {
            var oldSetting = this._usbStorageSetting ? this.usbStorageKey :
              this.tetheringWifiKey;
            this._incompatibleSettings(this.tetheringUsbKey, oldSetting, false);
          }
          break;
      }
    },

    reEnableWifiTetheringSetting: function() {
      if (!this.wifiHotspotSetting) {
        return;
      }

      // The time is used to avoid the quick changes on the toggle that may
      // cause bad user experience.
      this._setWifiTetheringSetting(false);
      setTimeout(() => {
        this._setWifiTetheringSetting(true);
      }, RE_ENABLE_WIFI_TETHERING_TIME);
    },

    /**
     * This is an internal function that can help us find out the matched
     * callback from catched listeners and remove it
     *
     * @memberOf Hotspot
     * @param {Array} listeners
     * @param {Function} callback
     */
    _removeEventListener: function(listeners, callback) {
      var index = listeners.indexOf(callback);
      if (index >= 0) {
        listeners.splice(index, 1);
      }
    },

    /**
     * This is an internal function that set a value to the
     * Wifi tethering setting
     *
     * @memberOf Hotspot
     * @param {Boolean} Setting value
     */
    _setWifiTetheringSetting: function(value) {
      var cset = {};
      cset[this.tetheringWifiKey] = value;
      this._settings.createLock().set(cset);
    },

    /**
     * This is an internal function that set a value to the
     * Usb tethering setting
     *
     * @memberOf Hotspot
     * @param {Boolean} Setting value
     */
    _setUsbTetheringSetting: function(value) {
      var cset = {};
      cset[this.tetheringUsbKey] = value;
      this._settings.createLock().set(cset);
    },

    addEventListener: function(eventName, callback) {
      if (eventName === 'incompatibleSettings') {
        this._incompatibleSettingsListeners.push(callback);
      } else if (eventName === 'wifiHotspotChange') {
        this._hotspotChangeListeners.push(callback);
      } else if (eventName === 'usbHotspotChange') {
        this._usbHotspotChangeListeners.push(callback);
      } else if (eventName === 'usbStorageChange') {
        this._usbStorageChangeListeners.push(callback);
      }
    },

    removeEventListener: function(eventName, callback) {
      if (eventName === 'incompatibleSettings') {
        this._removeEventListener(
          this._incompatibleSettingsListeners, callback);
      } else if (eventName === 'wifiHotspotChange') {
        this._removeEventListener(
          this._hotspotChangeListeners, callback);
      } else if (eventName === 'usbHotspotChange') {
        this._removeEventListener(
          this._usbHotspotChangeListeners, callback);
      } else if (eventName === 'usbStorageChange') {
        this._removeEventListener(
          this._usbStorageChangeListeners, callback);
      }
    },

    get wifiHotspotSetting() {
      return this._hotspotSetting;
    },

    get usbHotspotSetting() {
      return this._usbHotspotSetting;
    },

    get usbStorageSetting() {
      return this._usbStorageSetting;
    },

    set hotspotSetting(value) {
      this._setWifiTetheringSetting(value);
    },

    set usbHotspotSetting(value) {
      this._setUsbTetheringSetting(value);
    }
  };

  return function ctor_hotspot() {
    return new Hotspot();
  };
});
