define(function(require, exports, module) {
  'use strict';

  module.exports = function(a, b) {
    for (var key in b) { a[key] = b[key]; }
    return a;
  };
});
