'use strict';

(function(exports) {
  /**
   * SettingsHelper simplifies mozSettings access. It provides getter and setter
   * a specified setting. It iscreated by passing a setting key and an
   * optional default value.
   *
   * @param {String} key - The setting key
   * @param {Object} defaultValue - The default value
   *
   * Example:
   * // create a helper with a default false
   * var voicePrivacyHelper = SettingsHelper('ril.voicePrivacy.enabled', false);
   * // get value
   * voicePrivacyHelper.get(function(value) {});
   * // set value
   * voicePrivacyHelper.set(false, function() {});
   */
  var SettingsHelper = function(key, defaultValue) {
    var SETTINGS_KEY = key;
    var _settings = navigator.mozSettings;

    var _value = null;
    var _defaultValue = defaultValue;

    var _isReady = false;
    var _callbacks = [];

    var _return = function sh_return(callback) {
      if (!callback) {
        return;
      }
      callback.apply(null, Array.prototype.slice.call(arguments, 1));
    };

    var _ready = function sh_ready(callback) {
      if (!callback)
        return;

      if (_isReady) {
        callback();
      } else {
        _callbacks.push(callback);
      }
    };

    var _getValue = function sh_getValue(callback) {
      var req = _settings.createLock().get(SETTINGS_KEY);
      req.onsuccess = function() {
        _return(callback, req.result[SETTINGS_KEY]);
      };
      req.onerror = function() {
        console.error('Error getting ' + SETTINGS_KEY + '.');
        _return(callback, null);
      };
    };

    var _setValue = function sh_setValue(value, callback) {
      var obj = {};
      obj[SETTINGS_KEY] = value;
      var req = _settings.createLock().set(obj);
      req.onsuccess = function() {
        _return(callback);
      };
      req.onerror = function() {
        console.error('Error setting ' + SETTINGS_KEY + '.');
        _return(callback);
      };
    };

    var _init = function sh_init(callback) {
      _getValue(function(value) {
        _value = value ? value : _defaultValue;
        _return(callback);
      });

      _settings.addObserver(SETTINGS_KEY, function valuehanged(e) {
        _value = e.settingValue;
      });
    };

    _init(function() {
      _isReady = true;
      _callbacks.forEach(function(callback) {
        callback();
      });
    });

    return {
      /**
       * Get the setting value.
       *
       * @param {Function} callback - The setting value will be passed in the
                                      callback function.
       */
      get: function(callback) {
        _ready(function() {
          _return(callback, _value ? _value : _defaultValue);
        });
      },
      /**
       * Set the setting value.
       *
       * @param {Object} value The setting value
       * @param {Function} callback The callback function.
       */
      set: function(value, callback) {
        _ready(function() {
          _setValue(value, _return.bind(null, callback));
        });
      }
    };
  };

  exports.SettingsHelper = SettingsHelper;
})(this);
