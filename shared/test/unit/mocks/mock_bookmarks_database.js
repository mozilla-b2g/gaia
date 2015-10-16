'use strict';

(function(exports) {
  exports.MockBookmarksDatabase = {
    get: function() {},
    _callbacks: {},
    getAll: function() {},
    getRevisionId: function() {},
    addEventListener: function(type, cb) {
      this._callbacks[type] = cb;
    },
    removeEventListener: function(type) {
      this._callbacks[type] = null;
    },
    add: function(data) {
      if (this._callbacks.added) {
        this._callbacks.added(data);
      }
    },
    put: function(data) {
      if (this._callbacks.added) {
        this._callbacks.added(data);
      }
    },
    remove: function(id) {
      if (this._callbacks.removed) {
        this._callbacks.removed(id);
      }
    },
    clear: function() {}
  };
}(window));
