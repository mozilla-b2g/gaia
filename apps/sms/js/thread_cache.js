/*global  ThreadCache */

/*exported ThreadCache */

(function(exports) {
  'use strict';

  const CACHE_KEY = 'thread-cache',
        VERSION = -1;

  var cache,
      cacheJson;

  var ThreadCache = exports.ThreadCache = {
    init: function tc_init() {
      cacheJson = window.localStorage.getItem(CACHE_KEY);
      if (!cacheJson) {
        return;
      }

      cache = JSON.parse(cacheJson);

      // Clear cache if cache if outdated version
      if (cache.version !== VERSION) {
        cache = null;
      } else {
        delete cache.version;
      }
    },

    get: function tc_get() {
      return cache;
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
      cacheJson = JSON.stringify(cache);
      window.localStorage.setItem(CACHE_KEY, cacheJson);
    }
  };

  exports.ThreadCache = ThreadCache;
}(this));

ThreadCache.init();
