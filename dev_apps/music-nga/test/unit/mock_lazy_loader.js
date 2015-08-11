'use strict';
/* exported MockLazyLoader */

// Our MockLazyLoader is better than the shared one because we actually use a
// Promise for load(). However, trying to do that with the shared version breaks
// all the system app's tests. Oh well.
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
