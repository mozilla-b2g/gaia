/* exported AirplaneModeHelper */
'use strict';

/*
 * AirplaneModeHelper is a helper that makes apps enable / disable
 * airplane mode easily. It will expose two methods for you :
 *   1. AirplaneModeHelper.setEnabled();
 *   2. AirplaneModeHelper.addEventListener('statechange', callback)
 *   3. AirplaneModeHelper.removeEventListener('statechange', callback)
 *   3. AirplaneModeHelper.getStatus(callback);
 */
(function(exports) {

  // constants
  const kEventName = 'statechange';
  const kCommunicationKey = 'airplaneMode.enabled';
  const kStatusKey = 'airplaneMode.status';

  // main
  var AirplaneModeHelper = {
    _mozSettings: window.navigator.mozSettings,
    _callbacks: [],
    _cachedStatus: '',
    getStatus: function() {
      return this._cachedStatus;
    },
    addEventListener: function(eventName, callback) {
      if (eventName === kEventName) {
        this._callbacks.push(callback);
      }
    },
    removeEventListener: function(eventName, callback) {
      if (eventName === kEventName) {
        var index = this._callbacks.indexOf(callback);
        if (index >= 0) {
          this._callbacks.splice(index, 1);
        }
      }
    },
    setEnabled: function(enabled) {
      var status = this.getStatus();

      if (status === 'enabling' || status === 'disabling') {
        // do nothing when transition
      }
      else {
        if (enabled && status === 'enabled' ||
            !enabled && status === 'disabled') {
          return;
        }

        var setObj = {};
        setObj[kCommunicationKey] = enabled;
        this._mozSettings.createLock().set(setObj);
      }
    },
    init: function() {
      var self = this;

      // init _cachedStatus
      var lock = window.navigator.mozSettings.createLock();
      var req = lock.get(kStatusKey);
      req.onsuccess = function() {
        self._cachedStatus = req.result[kStatusKey];
        self._callbacks.forEach(function(callback) {
          callback(self._cachedStatus);
        });
      };

      this._mozSettings.addObserver(kStatusKey, function(evt) {
        var currentStatus = evt.settingValue;
        self._cachedStatus = currentStatus;
        self._callbacks.forEach(function(callback) {
          callback(currentStatus);
        });
      });
    }
  };

  exports.AirplaneModeHelper = AirplaneModeHelper;

  // by default, we will add observer immediately for you right after
  // you include this helper
  AirplaneModeHelper.init();
})(this);
