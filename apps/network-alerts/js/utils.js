'use strict';

(function(exports) {
var rparams = /([^?=&]+)(?:=([^&]*))?/g;

function parseParams(input) {
  input = input || window.location.href;
  var parsed = {};
  input.replace(rparams, function($0, $1, $2) {
    parsed[decodeURIComponent($1)] = $2 ? decodeURIComponent($2) : $2;
  });
  return parsed;
}

/**
 * Returns object that contains promise and related resolve\reject methods
 * to avoid wrapping long or complex code into single Promise constructor.
 * @returns {{promise: Promise, resolve: function, reject: function}}
 */
function defer() {
  var deferred = {};

  deferred.promise = new Promise(function(resolve, reject) {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });

  return deferred;
}

exports.Utils = {
  parseParams, defer
};

})(window);
