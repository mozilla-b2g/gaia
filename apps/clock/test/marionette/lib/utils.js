// deepMap
// Given an object
var deepMap = exports.deepMap = function(context, lookup, transform) {
  Object.keys(lookup).forEach(function(key) {
    var value = lookup[key];

    if (typeof value !== 'string') {
      context[key] = {};
      deepMap(context[key], value, transform);
    } else {
      transform.call(context, key, value);
    }
  });
};
