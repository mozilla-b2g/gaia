'use strict';

(function() {

  var listeners = {};

  var _iccId = Date.now();
  var _iccIds = [
    _iccId
  ];
  var _iccInfo = {
    addEventListener: function() {},
    getCardLockRetryCount: function() {
      return 4;
    },
    unlockCardLock: function(options) {
      return {
        set onsuccess(callback) {
          this.result = true;
          callback.call(this);
        }
      };
    }
  };

  function _setProperty(property, newState) {
    _iccInfo[property] = newState;
  }

  function _addEventListener(evtName, func) {
    listeners[evtName] = listeners[evtName] || [];
    listeners[evtName].push(func);
  }

  function _removeEventListener(evtName, func) {
    if (listeners[evtName]) {
      var listenerArray = listeners[evtName];
      var index = listenerArray.indexOf(func);
      if (index !== -1) {
        listenerArray.splice(index, 1);
      }
    }
  }

  function _getIccById(iccId) {
    if (iccId === _iccId) {
      return _iccInfo;
    }
    return null;
  }

  window.MockNavigatorMozIccManager = {
    iccIds: _iccIds,
    getIccById: _getIccById,
    setProperty: _setProperty,
    addEventListener: _addEventListener,
    removeEventListener: _removeEventListener
  };
})();
