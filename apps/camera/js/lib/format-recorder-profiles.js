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
  var option;
  var defaultOption;
  var video;

  for (var key in profiles) {
    // Bug 1091820 - [Camera] Add hasOwnProperty() check to recorderProfiles
    // loop
    if (!profiles.hasOwnProperty(key)) {
      continue;
    }

    profile = profiles[key];
    video = profile.video;

    // Don't include profile if marked as excluded
    if (exclude.indexOf(key) > -1) { continue; }

    pixelSize = video.width * video.height;

    option = {
      key: key,
      title: key + ' ' + video.width + 'x' + video.height,
      pixelSize: pixelSize,
      raw: profile
    };
    if (key === 'default') {
      defaultOption = option;
    } else {
      formatted.push(option);
    }
  }

  // Sort from largest to small but put the default/preferred profile first
  formatted.sort(function(a, b) { return b.pixelSize - a.pixelSize; });
  if (defaultOption) {
    formatted.unshift(defaultOption);
  }
  return formatted;
};

});
