'use strict';
/* exported MockLazyLoader */

var MockLazyLoader = {
  load: function(fileArray, callback) {
    if (callback) {
      callback();
    } else {
      return {
        then: function(callback) {
          callback();
          return {
            'catch': function() {}
          };
        }
      };
    }
  },

  getJSON: function(file) {
    return Promise.resolve({});
  }
};
