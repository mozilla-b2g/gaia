'use strict';
/* exported MockLazyLoader */
/* XXX: Bug 1098168
   We should use shared version, however, change it is bringing
   some unit test failures to other modules who use it. */

var MockLazyLoader = {
  load: function(fileArray, callback) {
    if (callback) {
      callback();
    } else {
      return {
        then: function(callback) {
          callback();
          return Promise.resolve({});
        }
      };
    }
  },

  getJSON: function(file) {
    return Promise.resolve({});
  }
};
