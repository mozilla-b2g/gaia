/* exported AirplaneModeHelper */

/*
 * AirplaneModeHelper is a helper that makes apps enable / disable
 * airplane mode easily. It will expose few methods for you :
 *
 *   1. AirplaneModeHelper.ready();
 *   2. AirplaneModeHelper.setEnabled();
 *   3. AirplaneModeHelper.getStatus();
 *   4. AirplaneModeHelper.addEventListener('statechange', callback)
 *   5. AirplaneModeHelper.removeEventListener('statechange', callback)
 *
 *   If you want to call getStatus(), please make sure to put them inside
 *   an anonymous function in AirplaneModeHelper.ready() because this is
 *   an async call.
 *
 *   Like this:
 *
 *   AirplaneModeHelper.ready(function() {
 *     var status = AirplaneModeHelper.getStatus();
 *   });
 */

(function(exports) {
  'use strict';
  // constants
  const kEventName = 'statechange';
  const kCommunicationKey = 'airplaneMode.enabled';
  const kStatusKey = 'airplaneMode.status';

  // main
  var AirplaneModeHelper = {
    _mozSettings: window.navigator.mozSettings,
    _callbacks: [],
    _cachedStatus: '',
    ready: function(cb) {
      if (this._cachedStatus === '') {
        var self = this;
        this.addEventListener(kEventName, function onChangeEvent() {
          // make sure _cachedStatus is definitely not ''
          if (self._cachedStatus !== '') {
            self.removeEventListener(kEventName, onChangeEvent);
            cb();
          }
        });
      } else {
        cb();
      }
    },
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
      this.ready(function() {
        var status = this.getStatus();

        if (status === 'enabling' || status === 'disabling') {
          // do nothing when transition
        } else {
          if (enabled && status === 'enabled' ||
              !enabled && status === 'disabled') {
            return;
          }

          var setObj = {};
          setObj[kCommunicationKey] = enabled;
          this._mozSettings.createLock().set(setObj);
        }
      }.bind(this));
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
