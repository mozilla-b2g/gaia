define(function(require, exports, module) {
'use strict';

/**
 * Returns all pictureSize options,
 * with overall bytes (estimation),
 * less than the bytes given.
 *
 * @param  {Number} bytes
 * @param  {Array} sizes
 * @return {Boolean}
 */
module.exports = function(bytes, sizes) {
  return sizes.filter(function(option) {
    var size = option.data;
    var mp = size.width * size.height;
    return mp <= bytes;
  });
};

});