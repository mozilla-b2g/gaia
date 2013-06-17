'use strict';

(function() {

  var listeners;

  function _init() {
    listeners = {};
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

  function _unlockCardLock(options) {
    var settingsRequest = {
      result: {},
      set onsuccess(callback) {
        callback.call(this);
      },
      set onerror(callback) {}
    };

    return settingsRequest;
  }

  var Mock = {
    mTeardown: _init,
    addEventListener: _addEventListener,
    removeEventListener: _removeEventListener,
    unlockCardLock: _unlockCardLock
  };

  _init();

  window.MockNavigatorMozIccManager = Mock;
})();
