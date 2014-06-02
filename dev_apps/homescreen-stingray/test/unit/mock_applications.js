'use strict';

(function(exports) {
  exports.MockApplications = {
    mCallbacks: {},
    mEntries: [],
    mApps: {},
    init: function() {
      this._inited = true;
    },
    uninit: function() {
      this._inited = false;
    },
    on: function(type, callback) {
      if (!this.mCallbacks[type]) {
        this.mCallbacks[type] = [];
      }
      this.mCallbacks[type].push(callback);
    },
    off: function(type, callback) {
      if (!this.mCallbacks[type]) {
        return;
      }
      var idx = this.mCallbacks[type].indexOf(callback);
      if (idx > -1) {
        this.mCallbacks[type].splice(idx, 1);
      }
    },
    trigger: function(type) {
      if (!this.mCallbacks[type]) {
        return;
      }

      var args = [].slice.call(arguments, 1);
      for (var i = 0; i < this.mCallbacks[type].length; i++) {
        this.mCallbacks[type][i].apply(this, args);
      }
      this.mCallbacks[type] = [];
    },
    ready: function(cb) {
      this.on('ready', cb);
    },
    getAppEntries: function() {
      return this.mEntries;
    },
    getAllAppEntries: function() {
      return this.mEntries;
    },
    launch: function() {
      return true;
    },
    getEntryManifest: function(manifestURL) {
      return this.mApps[manifestURL]
    },
    getName: function() {},
    getIconBlob: function(origin, entryPoint, preferredSize, callback) {
      callback(this.mIconBlob);
    },
    mIconBlob: null,
    mTeardown: function() {
      this.mCallbacks = {};
      this.mEntries = [];
    }
  };
})(window);
