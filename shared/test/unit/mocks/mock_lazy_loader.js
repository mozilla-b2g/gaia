'use strict';

var MockLazyLoader = {
  load: function(fileArray, callback) {
    if (callback) {
      callback();
    }
  }
};
