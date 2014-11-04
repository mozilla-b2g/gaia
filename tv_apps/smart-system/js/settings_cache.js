/**
 * SettingsCache is a singleton that caches mozSettings values for fast
 * access.
 *
 * @module SettingsCache
 */
(function() {
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
  var _keyCallbacks = {};

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

    if (_keyCallbacks[key]) {
      _keyCallbacks[key].forEach(function(callback) {
        callback(value);
      });
    }
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

    init: function sc_init() {
      // Make a request for settings to warm the cache, since we need it
      // very soon in startup after the DOM is available.
      this.getSettings();
    },

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

    observe: function sc_observe(name, defaultValue, callback) {
      if (!callback) {
        return;
      }
      this.getSettings(function(cache) {
        if (callback) {
          callback((typeof cache[name]) === 'undefined' ?
                   defaultValue : cache[name]);
        }
      });

      if (!_keyCallbacks[name]) {
        _keyCallbacks[name] = [];
      }
      _keyCallbacks[name].push(function(v) {
        callback((typeof v) === 'undefined' ? defaultValue : v);
      });
    },

    get: function sc_get(name, callback) {
      this.getSettings(function(cache) {
        callback(cache[name]);
      });
    }
  };

  SettingsCache.init();
  window.SettingsCache = SettingsCache;
})();
