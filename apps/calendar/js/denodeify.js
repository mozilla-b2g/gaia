/* global Promise */
/**
 * Inspired by Q's function of the same name.
 */
Calendar.denodeify = function(fn) {
  'use strict';
  // This is our new, denodified function. You can interact with it using
  // node-style callbacks or promises.
  return function() {
    // Original arguments to fn.
    var args = Array.slice(arguments);
    var callback = args[args.length - 1];
    if (typeof callback === 'function') {
      // If consumer is trying to interact with node-style callback, let them.
      return fn.apply(this, args);
    }

    return new Promise(function(resolve, reject) {
      args.push(function(err, result) {
        if (err) {
          return reject(err);
        }

        resolve(result);
      });

      fn.apply(this, args);
    }.bind(this));
  };
};

Calendar.denodeifyAll = function(object, methods) {
  'use strict';
  methods.forEach(function(method) {
    object[method] = Calendar.denodeify(object[method]);
  });
};
