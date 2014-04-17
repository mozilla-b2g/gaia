define(function(require, exports, module) {
'use strict';

/**
 * Returns a formatted list of recorder
 * profiles ready to be set as setting options.
 *
 * Options:
 *
 *   - `exclude {Array}`
 *
 * @param  {Object} profiles
 * @param  {Object} options
 * @return {Array}
 */
module.exports = function(profiles, options) {
  var exclude = options && options.exclude || [];
  var formatted = [];
  var pixelSize;
  var profile;
  var video;

  for (var key in profiles) {
    profile = profiles[key];
    video = profile.video;

    // Don't include profile if marked as excluded
    if (exclude.indexOf(key) > -1) { continue; }

    pixelSize = video.width * video.height;

    formatted.push({
      key: key,
      title: key + ' ' + video.width + 'x' + video.height,
      pixelSize: pixelSize,
      raw: profile
    });
  }

  formatted.sort(function(a, b) { return b.pixelSize - a.pixelSize; });
  return formatted;
};

});