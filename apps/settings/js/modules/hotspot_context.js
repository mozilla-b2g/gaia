/**
 * HotspotContext is a singleton that you can easily use it to fetch
 * some shared data across different panels
 *
 * @module HotspotContext
 */
define(function(require) {
  'use strict';

  // modules / helpers
  var SettingsCache = require('modules/settings_cache');
  var SettingsListener = require('shared/settings_listener');
  var settings = Settings.mozSettings;

  var _tetheringWifiKey = 'tethering.wifi.enabled';
  var _tetheringUsbKey = 'tethering.usb.enabled';
  var _usbStorageKey = 'ums.enabled';
  var _tetheringSecurityKey = 'tethering.wifi.security.type';
  var _tetheringPasswordKey = 'tethering.wifi.security.password';

  var HotspotContext = {
    /**
     * Wifi hotspot setting
     *
     * @memberOf HotspotContext
     * @type {Boolean}
     */
    _hotspotSetting: null,
    /**
     * Usb hotspot setting
     *
     * @memberOf HotspotContext
     * @type {Boolean}
     */
    _usbHotspotSetting: null,
    /**
     * Usb storage setting
     *
     * @memberOf HotspotContext
     * @type {Boolean}
     */
    _usbStorageSetting: null,
    /**
     * These listeners would be called when hotspot setting is changed
     *
     * @memberOf HotspotContext
     * @type {Array}
     */
    _hotspotChangeListeners: [],

    /**
     * These listeners would be called when usb hotspot setting is changed
     *
     * @memberOf HotspotContext
     * @type {Array}
     */
    _usbHotspotChangeListeners: [],

    /**
     * These listeners would be called when incompatibles settings are
     * enabled at the same time
     *
     * @memberOf HotspotContext
     * @type {Array}
     */
    _incompatibleSettingsListeners: [],

    /**
     * These listeners would be called when wifi security type changes
     *
     * @memberOf HotspotContext
     * @type {Array}
     */
    _wifiSecurityTypeChangeListeners: [],

    /**
     * Init is used to initialize some basic stuffs
     *
     * @memberOf HotspotContext
     */
    _init: function() {
      this._bindEvents();

      // we would call _updateHotspotSettings() and
      // _updatePasswordIfNeeded() when init
      this._updateHotspotSettings();
      this._updatePasswordIfNeeded();
    },

    /**
     * We will bind some default listeners here
     *
     * @memberOf HotspotContext
     */
    _bindEvents: function() {
      var self = this;

      // Wifi tethering enabled
      SettingsListener.observe(_tetheringWifiKey, true, function(enabled) {
        self._hotspotSettingChange(enabled);
      });

      // USB tethering enabled
      SettingsListener.observe(_tetheringUsbKey, true, function(enabled) {
        self._usbHotspotSettingChange(enabled);
      });

      // Wifi Security type
      SettingsListener.observe(_tetheringSecurityKey, 'wpa-psk',
        function(value) {
        self._wifiSecurityTypeChange(value);
      });
    },

    /**TODO
     * We will update hotspot and usb hotspot settings when
     * any of them have been changed and check if two incompatible
     * settings are enabled
     *
     * @memberOf HotspotContext
     */
    _updateHotspotSettings: function() {
      var self = this;

      SettingsCache.getSettings(function(results) {
        self._hotspotSetting = results[_tetheringWifiKey];
        self._usbHotspotSetting = results[_tetheringUsbKey];
        self._usbStorageSetting = results[_usbStorageKey];
      });
    },

    /**
     * We will generate a random password for the hotspot
     *
     * @memberOf HotspotContext
     */
    _generateHotspotPassword: function() {
      var words = ['amsterdam', 'ankara', 'auckland',
                 'belfast', 'berlin', 'boston',
                 'calgary', 'caracas', 'chicago',
                 'dakar', 'delhi', 'dubai',
                 'dublin', 'houston', 'jakarta',
                 'lagos', 'lima', 'madrid',
                 'newyork', 'osaka', 'oslo',
                 'porto', 'santiago', 'saopaulo',
                 'seattle', 'stockholm', 'sydney',
                 'taipei', 'tokyo', 'toronto'];
      var password = words[Math.floor(Math.random() * words.length)];
      for (var i = 0; i < 4; i++) {
        password += Math.floor(Math.random() * 10);
      }
      return password;
    },

    /**
     * We will update hotspot password if needed
     *
     * @memberOf HotspotContext
    */
    _updatePasswordIfNeeded: function() {
      var self = this;
      SettingsCache.getSettings(function(results) {
        if (!results[_tetheringPasswordKey]) {
          var lock = settings.createLock();
          var pwd = self._generateHotspotPassword();
          var cset = {};
          cset[_tetheringPasswordKey] = pwd;
          lock.set(cset);
        }
      });
    },

    /**
     * When wifi hotspot is changed, we will call all registered listeners
     *
     * @memberOf HotspotContext
     */
    _hotspotSettingChange: function(enabled) {
      this._hotspotChangeListeners.forEach(function(listener) {
        listener(enabled);
      });
      this._updateHotspotSettings();
    },

    /**
     * When usb hotspot is changed, we will call all registered listeners
     *
     * @memberOf HotspotContext
     */
    _usbHotspotSettingChange: function(enabled) {
      this._usbHotspotChangeListeners.forEach(function(listener) {
        listener(enabled);
      });
      this._updateHotspotSettings();
    },

    /**
     * When wifi security type is changed, we will call all
     * registered listeners
     *
     * @memberOf HotspotContext
     */
    _wifiSecurityTypeChange: function(value) {
      this._wifiSecurityTypeChangeListeners.forEach(function(listener) {
        listener(value);
      });
    },

    /**
     * When two incompatible settings are enabled we will call all
     * registered listeners.
     *
     * @param bothConflicts Indicates that usb hotspot has the two
     * possible conflicts (wifi hotspot and usb storage)
     *
     * @memberOf HotspotContext
     */
    _incompatibleSettings: function(newSetting, oldSetting, bothConflicts) {
      this._incompatibleSettingsListeners.forEach(function(listener) {
        listener(newSetting, oldSetting, bothConflicts);
      });
    },

    /**
     * Check if two incompatible settings are enabled
     *
     * @memberOf HotspotContext
     */
    _checkIncompatibleSettings: function(newSetting, value) {
      switch(newSetting) {
        case _tetheringWifiKey:
          // Early return if the user has disabled the setting
          if (!value) {
            this._setMozSetting(newSetting, value);
            return;
          }

          if (value && this._usbHotspotSetting) {
            this._incompatibleSettings(_tetheringWifiKey,
              _tetheringUsbKey, false);
          } else {
            this._setMozSetting(newSetting, value);
          }
          break;
        case _tetheringUsbKey:
          // Early return if the user has disabled the setting or the
          // incompatible settings are disabled
          if (!value || (!this._hotspotSetting && !this._usbStorageSetting)) {
            this._setMozSetting(newSetting, value);
            return;
          }
          if (this._usbStorageSetting && this._hotspotSetting) {
            this._incompatibleSettings(_tetheringUsbKey, null, true);
          } else {
            var oldSetting = this._usbStorageSetting ? _usbStorageKey :
              _tetheringWifiKey;
            this._incompatibleSettings(_tetheringUsbKey, oldSetting, false);
          }
          break;
      }
    },

    /**
     * This is an internal function that can help us find out the matched
     * callback from catched listeners and remove it
     *
     * @memberOf HotspotContext
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
     * specified key
     *
     * @memberOf HotspotContext
     * @param {String} Setting key
     * @param {Boolean} Setting value
     */
    _setMozSetting: function(key, value) {
      var cset = {};
      cset[key] = value;
      settings.createLock().set(cset);
    },

    /**
     * This is a function that get the value of the specified key
     *
     * @memberOf HotspotContext
     * @param {String} Setting key
     */
    _getMozSetting: function(key) {
      return new Promise(function(resolve, reject) {
        SettingsCache.getSettings(function(results) {
          resolve(results[key]);
        });
      });
    }
  };

  HotspotContext._init();

  return {
    addEventListener: function(eventName, callback) {
      if (eventName === 'incompatibleSettings') {
        HotspotContext._incompatibleSettingsListeners.push(callback);
      } else if (eventName === 'wifiHotspotChange') {
        HotspotContext._hotspotChangeListeners.push(callback);
      } else if (eventName === 'usbHotspotChange') {
        HotspotContext._usbHotspotChangeListeners.push(callback);
      } else if (eventName === 'securityTypeChange') {
        HotspotContext._wifiSecurityTypeChangeListeners.push(callback);
      }
    },
    removeEventListener: function(eventName, callback) {
      if (eventName === 'incompatibleSettings') {
        HotspotContext._removeEventListener(
          HotspotContext._incompatibleSettingsListeners, callback);
      } else if (eventName === 'wifiHotspotChange') {
        HotspotContext._removeEventListener(
          HotspotContext._hotspotChangeListeners, callback);
      } else if (eventName === 'usbHotspotChange') {
        HotspotContext._removeEventListener(
          HotspotContext._usbHotspotChangeListeners, callback);
      } else if (eventName === 'securityTypeChange') {
        HotspotContext._removeEventListener(
          HotspotContext._wifiSecurityTypeChangeListeners, callback);
      }
    },
    get wifiHotspotSetting() {
      return HotspotContext._hotspotSetting;
    },
    get usbHotspotSetting() {
      return HotspotContext._usbHotspotSetting;
    },
    get usbStorageSetting() {
      return HotspotContext._usbStorageSetting;
    },
    setMozSetting: function(key, value) {
      HotspotContext._setMozSetting(key, value);
    },
    getMozSetting: function(key) {
      return HotspotContext._getMozSetting(key);
    },
    checkIncompatibleSettings: function(newSetting, newValue) {
      HotspotContext._checkIncompatibleSettings(newSetting, newValue);
    }
  };
});
