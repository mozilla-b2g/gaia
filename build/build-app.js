'use strict';

/* global require, exports */

var utils = require('utils');

exports.execute = function(options) {
  var webapp = utils.getWebapp(options.APP_DIR, options);
  var appDir = utils.getFile(webapp.appDirPath);
  require(appDir.leafName + '/build').execute(options);

  // Wait for all app tasks to be done before proceeding.
  utils.processEvents(function () {
    return { wait: false };
  });

  require('post-app').execute(options, webapp);
};
