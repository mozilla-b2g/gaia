/**
 * Hotspot Settings:
 *   - Update Hotspot Settings
 * @module HotspotSettings
 */
define(function(require) {
  'use strict';

  var SettingsListener = require('shared/settings_listener');
  var SettingsCache = require('modules/settings_cache');
  var Observable = require('modules/mvvm/observable');

  /**
   * @alias module:hotspot/hotspot_settings
   * @requires module:modules/mvvm/observable
   * @requires module:modules/settings_cache
   * @returns {hotspotSettingsPrototype}
   */
  var hotspotSettingsPrototype = {
    /**
     * Hotspot SSID.
     *
     * @access private
     * @memberOf hotspotSettingsPrototype
     * @type {String}
     */
    hotspotSSID: '',

    /**
     * Hotspot security type
     *
     * @access private
     * @memberOf hotspotSettingsPrototype
     * @type {String}
     */
    hotspotSecurity: '',

    /**
     * Hotspot Password
     *
     * @access private
     * @memberOf hotspotSettingsPrototype
     * @type {String}
     */
    hotspotPassword: '',

    /**
     * Hotspot SSID setting key
     *
     * @access public
     * @memberOf hotspotSettingsPrototype
     * @type {String}
     */
    tetheringSSIDKey: 'tethering.wifi.ssid',

    /**
     * Hotspot security type setting key
     *
     * @access public
     * @memberOf hotspotSettingsPrototype
     * @type {String}
     */
    tetheringSecurityKey: 'tethering.wifi.security.type',

    /**
     * Hotspot password setting key
     *
     * @access public
     * @memberOf hotspotSettingsPrototype
     * @type {String}
     */
    tetheringPasswordKey: 'tethering.wifi.security.password',

    /**
     * Init module.
     *
     * @access private
     * @memberOf hotspotSettingsPrototype
     */
    _init: function hs_init() {
      this._settings = navigator.mozSettings;
      this._bindEvents();
      this._updateSSIDIfNeeded();
      this._updatePasswordIfNeeded();
    },

    /**
     * We will generate a random password for the hotspot
     *
     * @access private
     * @memberOf hotspotSettingsPrototype
     */
    _generateHotspotPassword: function hs_generateHotspotPassword() {
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

    _generateHotspotSSID: function hs_generateHotspotSSID() {
      var characters = 'abcdefghijklmnopqrstuvwxyz' +
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
      var ssid = 'FirefoxOS_';
      for (var i = 0; i < 10; i++) {
        ssid += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      return ssid;
    },
      
    _updateSSIDIfNeeded: function hs_updateSSIDIfNeeded() {
      var self = this;
      SettingsCache.getSettings(function(results) {
        if (!results[self.tetheringSSIDKey]) {
          var ssid = self._generateHotspotSSID();
          self.setHotspotSSID(ssid);
        }
      });
    },

    /**
     * We will update hotspot password if needed
     *
     * @access private
     * @memberOf hotspotSettingsPrototype
    */
    _updatePasswordIfNeeded: function hs_updatePasswordIfNeeded() {
      var self = this;
      SettingsCache.getSettings(function(results) {
        if (!results[self.tetheringPasswordKey]) {
          var pwd = self._generateHotspotPassword();
          self.setHotspotPassword(pwd);
        }
      });
    },

    /**
     * Sets the value to the tethering SSID setting
     *
     * @access public
     * @memberOf hotspotSettingsPrototype
     * @param {String} value
     */
    setHotspotSSID: function hs_setHotspotSSID(value) {
      var cset = {};
      cset[this.tetheringSSIDKey] = value;
      this._settings.createLock().set(cset);
    },

    /**
     * Sets the value to the tethering security type setting
     *
     * @access public
     * @memberOf hotspotSettingsPrototype
     * @param {String} value
     */
    setHotspotSecurity: function hs_setHotspotSecurity(value) {
      var cset = {};
      cset[this.tetheringSecurityKey] = value;
      this._settings.createLock().set(cset);
    },

    /**
     * Sets the value to the tethering password setting
     *
     * @access private
     * @memberOf hotspotSettingsPrototype
     * @param {String} value
     */
    setHotspotPassword: function hs_setHotspotPassword(value) {
      var cset = {};
      cset[this.tetheringPasswordKey] = value;
      this._settings.createLock().set(cset);
    },

    /**
     * Updates the current value of hotspot SSID
     *
     * @access private
     * @memberOf hotspotSettingsPrototype
     * @param {String} value
     */
    _onSSIDChange: function hs_onSSIDChange(value) {
      this.hotspotSSID = value;
    },

    /**
     * Updates the current value of hotspot security type
     *
     * @access private
     * @memberOf hotspotSettingsPrototype
     * @param {String} value
     */
    _onSecurityChange: function hs_onSecurityChange(value) {
      this.hotspotSecurity = value;
    },

    /**
     * Updates the current value of hotspot password
     *
     * @access private
     * @memberOf hotspotSettingsPrototype
     * @param {String} value
     */
    _onPasswordChange: function hs_onPasswordChange(value) {
      this.hotspotPassword = value;
    },

    /**
     * Listen to hotspot settings changes
     *
     * @access private
     * @memberOf hotspotSettingsPrototype
     */
    _bindEvents: function hs_bindEvents() {
      SettingsListener.observe(this.tetheringSSIDKey,
        '', this._onSSIDChange.bind(this));

      SettingsListener.observe(this.tetheringSecurityKey,
        'wpa-psk', this._onSecurityChange.bind(this));

      SettingsListener.observe(this.tetheringPasswordKey,
        '', this._onPasswordChange.bind(this));
    }
  };

  return function ctor_hotspotSettings() {
    // Create the observable object using the prototype.
    var hotspotSettings = Observable(hotspotSettingsPrototype);
    hotspotSettings._init();
    return hotspotSettings;
  };
});
