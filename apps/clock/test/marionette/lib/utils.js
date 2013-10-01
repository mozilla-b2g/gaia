// deepMap
// Transform a nested lookup table according to the provided `transform`
// function.
// Iterate over each key in a given object. If the corresponding value is a
// string, supply the key and value to the specified `transform` function and
// use its value in the "mapped" object. Otherwise, recurse into the nested
// object.
var deepMap = exports.deepMap = function(lookup, transform) {
  var context = {};
  Object.keys(lookup).forEach(function(key) {
    var value = lookup[key];

    if (typeof value !== 'string') {
      context[key] = deepMap(value, transform);
    } else {
      transform.call(context, key, value);
    }
  });
  return context;
};
