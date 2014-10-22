console.time("mock_lazy_loader.js");
'use strict';
/* exported MockLazyLoader */

var MockLazyLoader = {
  load: function(fileArray, callback) {
    if (callback) {
      callback();
    }
  }
};
console.timeEnd("mock_lazy_loader.js");
