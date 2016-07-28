(function() {
  'use strict';

  if (navigator.mozSettings) {
    return;
  }

  const KNOWN_SETTINGS = new Map();

  KNOWN_SETTINGS.set('locale.hour12', true);

  navigator.mozSettings = {
    createLock: function() {
      return {
        get: function(key) {
          var request = {
            addEventListener: function(eventName, callback) {
              request[eventName] = callback;
            }
          };

          window.setTimeout(function() {
            if (typeof request.onsuccess === 'function') {
              request.result = {};
              request.result[key] = KNOWN_SETTINGS.get(key);
              request.onsuccess.call(request);
            }
          }, 0);

          return request;
        },

        set() {}
      };
    },

    addObserver: function() {}
  };
})();
