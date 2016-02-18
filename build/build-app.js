'use strict';

var utils = require('./utils');

exports.execute = function(options) {
  var webapp = utils.getWebapp(options.APP_DIR, options);
  var appDir = utils.getFile(webapp.appDirPath);
  options.webapp = webapp;

  var buildDir = utils.joinPath(options.GAIA_DIR, 'build');
  var appBuildScriptPath = utils.joinPath(appDir.path, 'build/build');
  var requirePath = utils.relativePath(buildDir, appBuildScriptPath);

  return Promise.resolve()
    .then(() => {
      return require(requirePath).execute(options);
    })
    .then(() => {
      return require('./post-app').execute(options);
    })
    .catch((err) => {
      utils.log('build-app', err);
      utils.exit(1);
    });
};
