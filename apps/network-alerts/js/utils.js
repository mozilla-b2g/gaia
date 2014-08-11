'use strict';

(function(exports) {
var rparams = /([^?=&]+)(?:=([^&]*))?/g;

function parseParams(input) {
  input = input || window.location.href;
  var parsed = {};
  input.replace(rparams, function($0, $1, $2) {
    parsed[$1] = $2;
  });
  return parsed;
}

exports.Utils = {
  parseParams: parseParams
};
})(window);
