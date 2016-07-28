define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var getAspect = require('./get-aspect');

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
  var items = [];
  var hash  = {};

  for (var key in profiles) {
    if (!profiles.hasOwnProperty(key)) { continue; } // Bug 1091820

    var profile = profiles[key];
    var video = profile.video;
    var sizeKey = video.width + 'x' + video.height;

    // guard against duplicate profiles
    if (hash[sizeKey]) { continue; }

    // Don't include profile if marked as excluded
    if (exclude.indexOf(key) > -1) { continue; }

    var pixelSize = video.width * video.height;
    var aspect = getAspect(video.width, video.height);

    hash[sizeKey] = key;

    items.push({
      key: key,
      title: key + ' ' + sizeKey + ' ' + aspect,
      pixelSize: pixelSize,
      raw: profile
    });
  }

  // Sort from largest to small but put the default/preferred profile first
  items.sort(function(a, b) { return b.pixelSize - a.pixelSize; });

  return items;
};

});
