var fsPath = require('path');

var GAIA_ROOT = fsPath.resolve(__dirname, '..', '..', '..', '..');
var APP_ROOT = 'apps';
var TEST_ROOT = 'test/marionette/';

/**
 * Require some stuff from another app.
 *
 * @param {String} app inside of gaia.
 * @param {String} path inside of the apps test/marionette folder.
 * @return {Object} module require result.
 */
function requireFromApp(app, path) {
  var path = fsPath.join(GAIA_ROOT, APP_ROOT, app, TEST_ROOT, path);
  return require(path);
}

module.exports = requireFromApp;
