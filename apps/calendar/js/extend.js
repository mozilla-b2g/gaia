define(function(require, exports, module) {
'use strict';

module.exports = function(target, input) {
  for (var key in input) {
    if (hasOwnProperty.call(input, key)) {
      target[key] = input[key];
    }
  }

  return target;
};

});
