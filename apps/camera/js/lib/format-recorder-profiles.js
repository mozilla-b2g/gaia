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
  var option;
  var defaultOption;
  var resolution = {};

  function createOption(key) {
    // Bug 1091820 - [Camera] Add hasOwnProperty() check to recorderProfiles
    // loop
    if (!profiles.hasOwnProperty(key)) { return; }

    // Don't include profile if marked as excluded
    if (exclude.indexOf(key) > -1) { return; }

    var profile = profiles[key];
    var video = profile.video;
    var option = {
      key: key,
      title: video.width + 'x' + video.height,
      pixelSize: video.width * video.height,
      raw: profile
    };

    // Eliminate duplicate options with the same resolution
    if (resolution[option.title]) { return; }
    resolution[option.title] = true;

    return option;
  }

  // Ensure the default option, if present, is always in the final list
  defaultOption = createOption('default');

  for (var key in profiles) {
    option = createOption(key);
    if (!option) { continue; }

    formatted.push(option);
  }

  // Sort from largest to small but put the default/preferred profile first
  formatted.sort(function(a, b) { return b.pixelSize - a.pixelSize; });
  if (defaultOption) {
    formatted.unshift(defaultOption);
  }
  return formatted;
};

});
