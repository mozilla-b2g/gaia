define(function(require, exports, module) {
'use strict';

exports.filter = function(obj, fn, thisArg) {
  var results = [];
  exports.forEach(obj, function(key, value) {
    if (fn.call(thisArg, key, value)) {
      results.push(value);
    }
  });

  return results;
};

exports.forEach = function(obj, fn, thisArg) {
  exports.map(obj, fn, thisArg);
};

exports.map = function(obj, fn, thisArg) {
  var results = [];
  fn = fn || ((key, val) => val);
  Object.keys(obj).forEach((key) => {
    var value = obj[key];
    var result = fn.call(thisArg, key, value);
    results.push(result);
  });

  return results;
};

exports.values = function(obj) {
  return exports.map(obj, (key, value) => {
    return value;
  });
};

/**
 * Combine properties from all the objects into first one.
 * - This method affects target object in place, if you want to create a new
 *   Object pass an empty object as first param.
 * @param {object} target    Target Object
 * @param {...object} objects    Objects to be combined (0...n objects).
 * @return {object} Target Object.
 */
exports.mixIn = function(target, objects) {
  var i = 0,
    n = arguments.length,
    obj;
  while (++i < n) {
    obj = arguments[i];
    if (obj != null) {
      exports.forEach(obj, (key, val) => {
        target[key] = val;
      });
    }
  }
  return target;
};

});
