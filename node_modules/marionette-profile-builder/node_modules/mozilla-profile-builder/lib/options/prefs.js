var fs = require('fs'),
    fsPath = require('path'),
    pref = require('../pref');

var USER_PREF = 'user.js';
/**
 * Appends prefs to the given profile.
 *
 * Options:
 *  - (Object) prefs: key/value pairs.
 *
 * @param {String} profile path to profile.
 * @param {Object} options for prefs.
 * @param {Function} callback fires after successfully saving.
 */
function appendPrefs(profile, options, callback) {
  // we userPrefs was used in the past
  var prefsConfig = options.prefs || options.userPrefs;
  // don't do anything unless there are some new prefs
  if (!prefsConfig || Object.keys(prefsConfig).length === 0) {
    return process.nextTick(callback.bind(null, null, profile));
  }

  var filename = fsPath.join(profile, USER_PREF);
  fs.appendFile(filename, '\n' + pref(prefsConfig), function(err) {
    if (err) return callback(err);
    callback(null, profile);
  });
}

module.exports = appendPrefs;
