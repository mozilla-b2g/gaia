'use strict';
/* exported MockLazyLoader */

var MockLazyLoader = {
  load: function(fileArray, callback) {
    if (callback) {
      callback();
    }
  },

  getJSON: function(file) {
    return Promise.resolve({});
  }
};
