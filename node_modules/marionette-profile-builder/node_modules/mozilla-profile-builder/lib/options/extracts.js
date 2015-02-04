var fse = require('fs-extra');

/**
 * Recursively copy a directory of prebuilt files into a profile. Used for
 * overwriting files in a clean profile for tests.
 *
 * Options:
 *  - (Object) extract: Directory to copy into profile.
 *
 * @param {String} profile path to profile.
 * @param {Object} options for directory.
 * @param {Function} callback fires after successfully copying.
 */
function copyExtract(profile, options, callback) {
  // we userPrefs was used in the past
  var extractsDir = options.extracts;
  // don't do anything unless there is a directory to copy
  if (!extractsDir) {
    return process.nextTick(callback.bind(null, null, profile));
  }

  fse.copy(extractsDir, profile, function(err) {
    if (err) return callback(err);
    return callback(null, profile);
  });
}

module.exports = copyExtract;
