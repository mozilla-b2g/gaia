/**
 * @fileoverview Utilities for converting async functions which use
 *     node-style callbacks to also cater promises callers.
 */
define(function(require, exports) {
'use strict';

function denodeify(fn) {
  // This is our new, denodeified function. You can interact with it using
  // node-style callbacks or promises.
  return function() {
    // Original arguments to fn.
    var args = Array.slice(arguments);
    var callback = args[args.length - 1];
    if (typeof callback === 'function') {
      // If consumer is trying to interact with node-style callback, let them.
      return fn.apply(this, args);
    }

    // We need the defer style promise api here since we don't want to
    // accidentily step on functions that return things like DOMRequests...
    var deferred = defer();
    args.push((err, result) => {
      if (err) {
        return deferred.reject(err);
      }

      deferred.resolve(result);
    });

    // Return the promise <=> the function doesn't return an object.
    var returnValue = fn.apply(this, args);
    return typeof returnValue === 'object' ? returnValue : deferred.promise;
  };
}
exports.denodeify = denodeify;

function denodeifyAll(object, methods) {
  methods.forEach((method) => {
    object[method] = exports.denodeify(object[method]);
  });
}
exports.denodeifyAll = denodeifyAll;

function defer() {
  var deferred = {};
  var promise = new Promise((resolve, reject) => {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });

  deferred.promise = promise;
  return deferred;
}

});
