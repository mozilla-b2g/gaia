(function() {
  'use strict';

  if (navigator.mozSettings) {
    return;
  }

  const Settings = new Map([['locale.hour12', false]]);

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
              request.result[key] = Settings.get(key);
              request.onsuccess.call(request);
            }
          });

          return request;
        }
      };
    },

    addObserver: function() {}
  };
})();
