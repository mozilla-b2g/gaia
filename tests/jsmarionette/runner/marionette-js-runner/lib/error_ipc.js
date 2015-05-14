'use strict';
/**
Error passing helpers when doing ipc.
*/

// Some usually non enumerable properties which we need to enumerate (for good
// reasons!).
var ERROR_KEYS = [
  'name',
  'code',
  'stack',
  'message'
];

/**
Convert something that might be an error into something we can send via IPC.

@param {?Erorr} maybeError something that might be an error.
@return {Object}
*/
module.exports.serialize = function(maybeError) {
  if (!maybeError) return maybeError;
  return ERROR_KEYS.reduce(function(current, key) {
    // Skip adding the key if the key is not in the original error.
    // Note intentional use of != null to check for null or undefined.
    if (current[key] != null) {
      return current;
    }
    current[key] = maybeError[key];
    return current;
  }, {});
};

/**
Convert something that may have been serialized into an error object.

@param {?Object} serialized input from a serialize function.
@return {Error} deserialized error.
*/
module.exports.deserialize = function(serialized) {
  if (!serialized) return;
  var error = new Error(serialized.message || '');
  for (var key in serialized) error[key] = serialized[key];
  return error;
};
