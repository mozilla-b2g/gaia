'use strict';
/* exported MockLazyLoader */

var MockLazyLoader = {
  load: function(fileArray, callback) {
    if (callback) {
      callback();
    } else {
      return Promise.resolve();
    }
  },

  getJSON: function(file) {
    return Promise.resolve({});
  }
};
