var fsPath = require('path'),
    fs = require('fs');

/**
 * Detects the gaia profile inside of a runtime directory.
 *
 * @param {String} path of runtime.
 * @return {String} location of base profile.
 */
function gaiaProfile (basePath, callback) {
  var foundPath = false;
  var pending = 2;

  function next(path, exists) {
    if (exists) {
      foundPath = true;
      callback(null, path);
    }

    if (--pending === 0 && !foundPath) {
      callback(new Error('could not find path to gaia profile'));
    }
  }

  var linux = fsPath.join(basePath, 'gaia', 'profile');
  fs.exists(linux, next.bind(null, linux))

  var osx = fsPath.join(basePath, 'Contents', 'MacOS', 'gaia', 'profile');
  fs.exists(osx, next.bind(null, osx));
}

module.exports = gaiaProfile;
