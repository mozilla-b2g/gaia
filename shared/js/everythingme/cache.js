'use strict';
/* global Promise*/
/* global asyncStorage*/

(function(eme) {
  var PREFIX = 'eme-cache';
  var slice = Function.call.bind(Array.prototype.slice);


  function Cache() { }

  Cache.prototype = {
    generateKey: function cache_generateKey() {
      return slice(arguments).map(JSON.stringify).join('|');
    },

    add: function cache_add(key, value) {
      return new Promise(function ready(resolve, reject) {
        asyncStorage.setItem(PREFIX + key, value);
      });
    },
    get: function cache_get(key) {
      return new Promise(function ready(resolve, reject) {
        asyncStorage.getItem(PREFIX + key, function onValue(value) {
          if (value === null) {
            reject(null);
          } else {
            resolve(value);
          }
        });
      });
    },

    addRequest: function cache_addRequest(service, method, options, response) {
      this.add(this.generateKey(service, method, options), response);
    },
    getRequest: function cache_getRequest(service, method, options) {
      return this.get(this.generateKey(service, method, options));
    }
  };

  eme.Cache = new Cache();

})(window.eme);
