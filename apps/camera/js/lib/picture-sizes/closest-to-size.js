define(function(require, exports, module) {
'use strict';

/**
 * Returns the closest matching pictureSize,
 * that is larger than the given `target`
 * pictureSize.
 *
 * @param  {Array} options
 * @param  {Object} target
 * @return {Object}
 * @public
 */
module.exports = function (target, options) {
  var width = target.width || 0;
  var height = target.height || 0;

  return options.reduce(function(result, option) {
    var resultSize = result && result.data;

    // When we format the pictureSizes from
    // the camera capabilities, we store the
    // picture size data (width, height) in
    // the `data` key of the setting model.
    var size = option.data;

    var largerThanTarget =
      size.width >= width &&
      size.height >= height;

    // If we don't yet have a result and this option
    // is larger than the target dimensions, use it.
    if (!result) { return largerThanTarget ? option : null; }

    // If it's not larger than the target,
    // this option isn't going to be appropriate.
    if (!largerThanTarget) { return result; }

    var smallerThanCurrent =
      size.width <= resultSize.width &&
      size.height <= resultSize.height;

    // If the option is larger than the target, yet
    // smaller is size than the current choice use it!
    return smallerThanCurrent ? option : result;
  }, null);
};

});