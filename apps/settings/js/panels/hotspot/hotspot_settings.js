/**
 * Hotspot Settings:
 *   - Update Hotspot Settings
 * @module HotspotSettings
 */
define(function(require) {
  'use strict';

  var SettingsListener = require('shared/settings_listener');
  var SettingsCache = require('modules/settings_cache');
  var Module = require('modules/base/module');
  var Observable = require('modules/mvvm/observable');

  /**
   * @requires module:modules/mvvm/observable
   * @requires module:modules/settings_cache
   * @returns {HotspotSettings}
   */
  var HotspotSettings = Module.create(function HotspotSettings() {
    this.super(Observable).call(this);
    this._init();
  }).extend(Observable);

  /**
   * Hotspot SSID setting key
   *
   * @access public
   * @memberOf HotspotSettings
   * @type {String}
   */
  Object.defineProperty(HotspotSettings.prototype, 'tetheringSSIDKey', {
    get: function() {
      return 'tethering.wifi.ssid';
    }
  });

  /**
   * Hotspot security type setting key
   *
   * @access public
   * @memberOf HotspotSettings
   * @type {String}
   */
  Object.defineProperty(HotspotSettings.prototype, 'tetheringSecurityKey', {
    get: function() {
      return 'tethering.wifi.security.type';
    }
  });

  /**
   * Hotspot password setting key
   *
   * @access public
   * @memberOf HotspotSettings
   * @type {String}
   */
  Object.defineProperty(HotspotSettings.prototype, 'tetheringPasswordKey', {
    get: function() {
      return 'tethering.wifi.security.password';
    }
  });

  /**
   * Hotspot SSID.
   *
   * @access private
   * @memberOf HotspotSettings
   * @type {String}
   */
  Observable.defineObservableProperty(HotspotSettings.prototype,
    'hotspotSSID', {
      readonly: true,
      value: ''
  });

  /**
   * Hotspot security type
   *
   * @access private
   * @memberOf HotspotSettings
   * @type {String}
   */
  Observable.defineObservableProperty(HotspotSettings.prototype,
    'hotspotSecurity', {
      readonly: true,
      value: ''
  });

  /**
   * Hotspot Password
   *
   * @access private
   * @memberOf HotspotSettings
   * @type {String}
   */
  Observable.defineObservableProperty(HotspotSettings.prototype,
    'hotspotPassword', {
      readonly: true,
      value: ''
  });

  /**
   * Init module.
   *
   * @access private
   * @memberOf HotspotSettings
   */
  HotspotSettings.prototype._init = function() {
    this._settings = navigator.mozSettings;
    this._bindEvents();
    this._updatePasswordIfNeeded();
  };

  /**
   * We will generate a random password for the hotspot
   *
   * @access private
   * @memberOf HotspotSettings
   */
  HotspotSettings.prototype._generateHotspotPassword = function() {
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
  };

  /**
   * We will update hotspot password if needed
   *
   * @access private
   * @memberOf HotspotSettings
  */
  HotspotSettings.prototype._updatePasswordIfNeeded = function() {
    var self = this;
    SettingsCache.getSettings(function(results) {
      if (!results[self.tetheringPasswordKey]) {
        var pwd = self._generateHotspotPassword();
        self.setHotspotPassword(pwd);
      }
    });
  };

  /**
   * Sets the value to the tethering SSID setting
   *
   * @access public
   * @memberOf HotspotSettings
   * @param {String} value
   */
  HotspotSettings.prototype.setHotspotSSID = function(value) {
    var cset = {};
    cset[this.tetheringSSIDKey] = value;
    this._settings.createLock().set(cset);
  };

  /**
   * Sets the value to the tethering security type setting
   *
   * @access public
   * @memberOf HotspotSettings
   * @param {String} value
   */
  HotspotSettings.prototype.setHotspotSecurity = function(value) {
    var cset = {};
    cset[this.tetheringSecurityKey] = value;
    this._settings.createLock().set(cset);
  };

  /**
   * Sets the value to the tethering password setting
   *
   * @access private
   * @memberOf HotspotSettings
   * @param {String} value
   */
  HotspotSettings.prototype.setHotspotPassword = function(value) {
    var cset = {};
    cset[this.tetheringPasswordKey] = value;
    this._settings.createLock().set(cset);
  };

  /**
   * Updates the current value of hotspot SSID
   *
   * @access private
   * @memberOf HotspotSettings
   * @param {String} value
   */
  HotspotSettings.prototype._onSSIDChange = function(value) {
    this._hotspotSSID = value;
  };

  /**
   * Updates the current value of hotspot security type
   *
   * @access private
   * @memberOf HotspotSettings
   * @param {String} value
   */
  HotspotSettings.prototype._onSecurityChange = function(value) {
    this._hotspotSecurity = value;
  };

  /**
   * Updates the current value of hotspot password
   *
   * @access private
   * @memberOf HotspotSettings
   * @param {String} value
   */
  HotspotSettings.prototype._onPasswordChange = function(value) {
    this._hotspotPassword = value;
  };

  /**
   * Listen to hotspot settings changes
   *
   * @access private
   * @memberOf HotspotSettings
   */
  HotspotSettings.prototype._bindEvents = function() {
    SettingsListener.observe(this.tetheringSSIDKey,
      '', this._onSSIDChange.bind(this));

    SettingsListener.observe(this.tetheringSecurityKey,
      'wpa-psk', this._onSecurityChange.bind(this));

    SettingsListener.observe(this.tetheringPasswordKey,
      '', this._onPasswordChange.bind(this));
  };

  return HotspotSettings;
});
