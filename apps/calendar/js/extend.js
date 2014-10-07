(function(exports) {
'use strict';

exports.extend = function(target, input) {
  for (var key in input) {
    if (hasOwnProperty.call(input, key)) {
      target[key] = input[key];
    }
  }

  return target;
};

}(Calendar));
