define(function(require, exports, module) {
  'use strict';

  module.exports = function deepMix(target, source) {
    var key;
    var value;
    if (source) {
      for(key in source) {
        value = source[key];
        if (typeof value === 'object' && value &&
            !Array.isArray(value) && typeof value !== 'function' &&
            !(value instanceof RegExp)) {
            if (!target[key]) {
              target[key] = {};
            }
            deepMix(target[key], value);
        } else {
          target[key] = value;
        }
      }
    }
    return target;
  };

});
