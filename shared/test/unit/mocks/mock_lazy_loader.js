'use strict';
/* exported MockLazyLoader */

var MockLazyLoader = {
  load: function(fileArray, callback) {
    if (callback) {
      callback();
    }
  }
};
