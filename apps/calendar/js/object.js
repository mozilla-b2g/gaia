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

});
