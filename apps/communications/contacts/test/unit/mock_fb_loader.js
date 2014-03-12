'use strict';
/* exported MockFbLoader */

var MockFbLoader = function() {
  return {
    loaded: true,
    load: function(callback) {
      callback();
    }
  };
}();
