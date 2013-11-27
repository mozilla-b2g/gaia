'use strict';
(function() {

  // container for icc instances
  var iccs = {};

  var MockIccManager = {
    _eventListeners: {},
    addEventListener: function(type, callback) {
      if (!this._eventListeners[type]) {
        this._eventListeners[type] = [];
      }
      var eventLength = this._eventListeners[type].length;
      this._eventListeners[type][eventLength] = callback;
    },
    addIcc: function(id, object) {
      // override by default
      iccs[id] = this._wrapIcc(object);
    },
    removeIcc: function(id) {
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

      object.iccInfo = {
        msisdn: '0912345678'
      };

      object._eventListeners = {};

      object.addEventListener = function(type, callback) {
        if (!this._eventListeners[type]) {
          this._eventListeners[type] = [];
        }
        var eventLength = this._eventListeners[type].length;
        this._eventListeners[type][eventLength] = callback;
      };

      return object;
    }
  };

  // add default Icc instance at first
  MockIccManager.addIcc('12345', {
    'cardState': 'ready'
  });

  window.MockNavigatorMozIccManager = MockIccManager;
})();
