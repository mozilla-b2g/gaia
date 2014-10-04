define(function(require, exports, module) {
'use strict';

module.exports = function(a, b) {
  if (a > b) {
    return 1;
  }

  if (a < b) {
    return -1;
  }

  return 0;
};

});
