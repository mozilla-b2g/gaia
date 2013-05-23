'use strict';

(function() {
  var lastWakeLock,
      throwAtNextUnlock;

  function mnwl_requestWakeLock(lock) {
    lastWakeLock = {
      released: false,
      topic: lock,
      unlock: function() {
        if (throwAtNextUnlock) {
          throwAtNextUnlock = false;
          throw 'NS_ERROR_DOM_INVALID_STATE_ERR';
        }

        this.released = true;
      }
    };
    return lastWakeLock;
  }

  function mnwl_teardown() {
    lastWakeLock = undefined;
    throwAtNextUnlock = undefined;
  }

  function mnwl_throwAtNextUnlock() {
    throwAtNextUnlock = true;
  }

  window.MockNavigatorWakeLock = {
    requestWakeLock: mnwl_requestWakeLock,
    mTeardown: mnwl_teardown,
    mThrowAtNextUnlock: mnwl_throwAtNextUnlock,
    get mLastWakeLock() {
      return lastWakeLock;
    }
  };

})();
