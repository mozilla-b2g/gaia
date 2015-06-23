/* exported MockLoader */

'use strict';

var MockLoader = {
  utility: function(view, callback, type) {
    callback();
  },
  view: function(view, callback) {
    callback();
  }
};
