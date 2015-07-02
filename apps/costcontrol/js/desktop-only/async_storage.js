(function(exports) {
  'use strict';

  const store = new Map();

  function isParentAsyncStorageAvailable() {
    return !!(window.parent &&
      window.parent !== window &&
      window.parent.asyncStorage);
  }

  function callCallback(value, callback) {
    if (typeof callback === 'function') {
      setTimeout(callback.bind(null, value));
    }
  }

  Object.defineProperty(exports, 'asyncStorage', {
    value: {
      getItem: function asm_getItem(key, callback) {
        if (isParentAsyncStorageAvailable()) {
          window.parent.asyncStorage.getItem(key, callback);
          return;
        }

        callCallback(store.get(key) || null, callback);
      },
      setItem: function asm_setItem(key, value, callback) {
        if (isParentAsyncStorageAvailable()) {
          window.parent.asyncStorage.setItem(key, value, callback);
          return;
        }

        callCallback(store.set(key, value), callback);
      },
      removeItem: function asm_removeItem(key, callback) {
        if (isParentAsyncStorageAvailable()) {
          window.parent.asyncStorage.removeItem(key, callback);
          return;
        }

        callCallback(store.delete(key), callback);
      },
      clear: function asm_clear(callback) {
        if (isParentAsyncStorageAvailable()) {
          window.parent.asyncStorage.clear(callback);
          return;
        }

        callCallback(store.clear(), callback);
      },
      length: function(callback) {
        if (isParentAsyncStorageAvailable()) {
          window.parent.asyncStorage.length(callback);
          return;
        }

        callCallback(store.size, callback);
      },
      key: function() {
        throw new Error('Not Implemented');
      }
    }
  });
})(window);
