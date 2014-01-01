define(function() {
  'use strict';

  return function(num, length) {
    var r = String(num);
    while (r.length < length) {
      r = '0' + r;
    }
    return r;
  };
});
