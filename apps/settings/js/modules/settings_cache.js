/**
 * SettingsCache is a singleton that caches mozSettings values for fast
 * access.
 *
 * @module SettingsCache
 */
define(function() {
  'use strict';
  var _settings = window.navigator.mozSettings;

  // Cache of all current settings values.  There's some large stuff
  // in here, but not much useful can be done with the settings app
  // without these, so we keep this around most of the time.
  var _settingsCache = null;

  // True when a request has already been made to fill the settings
  // cache.  When this is true, no further get("*") requests should be
  // made; instead, pending callbacks should be added to
  // _pendingSettingsCallbacks.
  var _settingsCacheRequestSent = null;

  // There can be race conditions in which we need settings values,
  // but haven't filled the cache yet.  This array tracks those
  // listeners.
  var _pendingSettingsCallbacks = [];

  var _callbacks = [];

  var _onSettingsChange = function sc_onSettingsChange(event) {
    var key = event.settingName;
    var value = event.settingValue;

    // Always update the cache if it's present, even if the DOM
    // isn't loaded yet.
    if (_settingsCache) {
      _settingsCache[key] = value;
    }

    _callbacks.forEach(function(callback) {
      callback(event);
    });
  };

  if (_settings) {
    _settings.onsettingchange = _onSettingsChange;
  }

  /**
   * Event reporting that a setting value is changed.
   *
   * @event module:SettingsCache#settingsChange
   * @property {MozSettingsEvent} event
   */
  var SettingsCache = {
    // the reset function is for unit tests
    reset: function sc_reset() {
      _settings = window.navigator.mozSettings;
      if (_settings) {
        _settings.onsettingchange = _onSettingsChange;
      }
      _settingsCache = null;
      _settingsCacheRequestSent = null;
      _pendingSettingsCallbacks = [];
      _callbacks = [];
    },

    get cache() {
      return _settingsCache;
    },

    /**
     * Where callback is a function to be called with a request object for a
     * successful fetch of settings values, when those values are ready.
     *
     * @alias module:SettingsCache#getSettings
     * @param {Function} callback
     */
    getSettings: function sc_getSettings(callback) {
      if (!_settings) {
        return;
      }

      if (_settingsCache && callback) {
        // Fast-path that we hope to always hit: our settings cache is
        // already available, so invoke the callback now.
        callback(_settingsCache);
        return;
      }

      if (!_settingsCacheRequestSent && !_settingsCache) {
        _settingsCacheRequestSent = true;
        var lock = _settings.createLock();
        var request = lock.get('*');
        request.onsuccess = function(e) {
          var result = request.result;
          var cachedResult = {};
          for (var attr in result) {
            cachedResult[attr] = result[attr];
          }
          _settingsCache = cachedResult;
          var cbk;
          while ((cbk = _pendingSettingsCallbacks.pop())) {
            cbk(result);
          }
        };
      }
      if (callback) {
        _pendingSettingsCallbacks.push(callback);
      }
    },

    /**
     * @alias module:SettingsCache#addEventListener
     * @param {String} eventName
     * @param {Function} callback
     */
    addEventListener: function sc_addEventListener(eventName, callback) {
      if (eventName !== 'settingsChange') {
        return;
      }
      var index = _callbacks.indexOf(callback);
      if (index === -1) {
        _callbacks.push(callback);
      }
    },

    /**
     * @alias module:SettingsCache#removeEventListener
     * @param {String} eventName
     * @param {Function} callback
     */
    removeEventListener: function sc_removeEventListsner(eventName, callback) {
      if (eventName !== 'settingsChange') {
        return;
      }
      var index = _callbacks.indexOf(callback);
      if (index !== -1) {
        _callbacks.splice(index, 1);
      }
    }
  };

  // Make a request for settings to warm the cache, since we need it
  // very soon in startup after the DOM is available.
  SettingsCache.getSettings(null);

  return SettingsCache;
});
