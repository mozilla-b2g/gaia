define(function(require) {
  'use strict';

  const KEY = 'operatorResources.data.icon';

  var initialized = false;
  var map = {};

  function getCustomizedNetworkTypeMap() {
    if (initialized) {
      return Promise.resolve(map);
    } else {
      return new Promise((resolve) => {
        var req = navigator.mozSettings.createLock().get(KEY);
        req.onsuccess = function() {
          initialized = true;
          var result = req.result[KEY];
          if (result && Object.keys(result).length) {
            map = Object.create(result);
          }
          resolve(map);
        };
        req.onerror = function() {
          initialized = true;
          console.error('Error loading ' + KEY + ' settings. ' +
            req.error && req.error.name);
          resolve(map);
        };
      });
    }
  }

  return Object.freeze({
    get: getCustomizedNetworkTypeMap
  });
});
