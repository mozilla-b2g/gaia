/*global  asyncStorage,
          Promise,
          ThreadCache,
          Utils */

/*exported ThreadCache */

(function(exports) {
  'use strict';

  const CACHE_KEY = 'thread-cache',
        VERSION = -1;

  var cache,
      cacheLoaded = false,
      cacheDefer;

  var ThreadCache = exports.ThreadCache = {
    init: function tc_init() {
      cacheDefer = Utils.Promise.defer();

      asyncStorage.getItem(CACHE_KEY, function(result) {
        cacheLoaded = true;
        cache = result;

        if (!cache) {
          cacheDefer.resolve(cache);
          return;
        }

        // Clear cache if cache if outdated version
        if (cache.version !== VERSION) {
          cache = null;
        } else {
          delete cache.version;
        }

        cacheDefer.resolve(cache);
      });
    },

    get: function tc_get() {
      return cacheLoaded ?
        Promise.resolve(cache) : cacheDefer.promise;
    },

    set: function tc_add(id, record) {
      cache[id] = record;
      this.save();
    },

    markAsRead: function tc_markAsRead(id) {
      if (!cache[id]) {
        return;
      }

      cache[id].unreadCount = 0;
      this.save();
    },

    delete: function tc_delete(id) {
      if (!cache[id]) {
        return;
      }

      delete cache[id];
      this.save();
    },

    save: function tc_save(data) {
      cache = data || cache;

      cache.version = VERSION;
      asyncStorage.setItem(CACHE_KEY, cache);
    }
  };

  exports.ThreadCache = ThreadCache;
}(this));

ThreadCache.init();
