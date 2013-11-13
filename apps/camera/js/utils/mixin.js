/*global define*/

define(function() {
  'use strict';

  return function(a, b) {
    for (var key in b) {
      a[key] = b[key];
    }

    return a;
  };
});