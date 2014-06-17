/*global Map, Promise */

(function(exports) {
  'use strict';

  var Cache = function() {
    this._internalCache = new Map();
  };

  Cache.prototype.get = function(key) {
    return this._internalCache.has(key) ?
      Promise.resolve(this._internalCache.get(key)) :
      Promise.reject(new Error('Key "' + key + '" is not found!'));
  };

  Cache.prototype.has = function(key) {
    return Promise.resolve(this._internalCache.has(key));
  };

  Cache.prototype.remove = function(key) {
    return this._internalCache.has(key) ?
      Promise.resolve(this._internalCache.delete(key)) :
      Promise.reject(new Error('Key "' + key + '" is not found!'));
  };

  exports.Cache = Cache;
})(window);
