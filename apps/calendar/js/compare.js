(function(exports) {
'use strict';

exports.compare = function(a, b) {
  if (a > b) {
    return 1;
  }

  if (a < b) {
    return -1;
  }

  return 0;
};

}(Calendar));
