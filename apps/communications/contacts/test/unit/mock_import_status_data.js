'use strict';
/* global Promise */
/* exported MockImportStatusData */

var MockImportStatusData = {
  keys: Object.create(null),

  get: function get(key) {
    return Promise.resolve(this.keys[key]);
  },

  put: function put(key, obj) {
    this.keys[key] = obj;
    return Promise.resolve();
  },

  remove: function remove(key) {
    delete this.keys[key];
    return Promise.resolve();
  },

  clear: function clear() {
    this.keys = Object.create(null);
    return Promise.resolve();
  }
};
