'use strict';

var MockLazyLoader = {
  load: function(fileArray, callback) {
    callback();
  }
};
