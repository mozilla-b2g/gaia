'use strict';
(function() {

  // container for icc instances
  var iccs = {};
  var iccIds = [];

  var MockIccManager = {
    _eventListeners: {},
    get iccIds() {
      return iccIds;
    },
    addEventListener: function(type, callback) {
      if (!this._eventListeners[type]) {
        this._eventListeners[type] = [];
      }
      var eventLength = this._eventListeners[type].length;
      this._eventListeners[type][eventLength] = callback;
    },
    addIcc: function(id, object) {
      object = object || {};

      // override by default
      if (iccIds.indexOf(id) == -1) {
        iccIds.push(id);
      }
      iccs[id] = this._wrapIcc(object);
    },
    removeIcc: function(id) {
      var index = iccIds.indexOf(id);
      if (index >= 0) {
        iccIds.splice(index, 1);
      }
      if (iccs[id]) {
        delete iccs[id];
      }
    },
    getIccById: function(id) {
      if (id in iccs) {
        return iccs[id];
      }
      return;
    },
    // we will wrap icc to add some internal
    // methods that will be called outside
    _wrapIcc: function(object) {

      object.setCardLock = function(options) {
        var handlers = {
          error: {
            lockType: options.lockType,
            retryCount: object.retryCount
          }
        };

        // We can manipulate object here
        object._setCardLockOptions = options;
        object._setCardLockCachedHandlers = handlers;
        return handlers;
      };

      object.getCardLock = function(type) {
        object._getCardLockType = type;
        var obj = {
          onsuccess: null,
          result: {
            enabled: true
          }
        };
        setTimeout(function() {
          if (obj.onsuccess) {
            obj.onsuccess();
          }
        });
        return obj;
      };

      object.getCardLockRetryCount = function(type) {
        var req = {
          result: { retryCount: 3 }
        };
        setTimeout(function() {
          req.onsuccess && req.onsuccess();
        });
        return req;
      };

      object.iccInfo = object.iccInfo || { msisdn: '0912345678' };
      object._eventListeners = {};

      object.addEventListener = function(type, callback) {
        if (!this._eventListeners[type]) {
          this._eventListeners[type] = [];
        }
        var eventLength = this._eventListeners[type].length;
        this._eventListeners[type][eventLength] = callback;
      };

      object.removeEventListener = function(type, callback) {
        if (this._eventListeners[type]) {
          var idx = this._eventListeners[type].indexOf(callback);
          this._eventListeners[type].splice(idx, 1);
        }
      };

      object.triggerEventListeners = function(type, evt) {
        if (!this._eventListeners[type]) {
          return;
        }
        this._eventListeners[type].forEach(function(callback) {
          if (typeof callback === 'function') {
            callback(evt);
          } else if (typeof callback == 'object' &&
                     typeof callback['handleEvent'] === 'function') {
            callback['handleEvent'](evt);
          }
        });

        if (typeof object['on' + type] === 'function') {
          object['on' + type](evt);
        }
      };

      return object;
    },
    mTeardown: function iccm_teardown() {
      iccIds = [];
      iccs = {};
    }
  };

  // add default Icc instance at first
  MockIccManager.addIcc('12345', {
    'cardState': 'ready'
  });

  window.MockNavigatorMozIccManager = MockIccManager;
})();
