'use strict';

/* global require, exports */

var utils = require('utils');
var nodeHelper = new utils.NodeHelper();

exports.execute = function(options) {
  var webapp = utils.getWebapp(options.APP_DIR, options);
  var appDir = utils.getFile(webapp.appDirPath);
  require(appDir.leafName + '/build').execute(options, webapp);

  // Wait for all app tasks to be done before proceeding.
  utils.processEvents(function () {
    return { wait: false };
  });

  options.webapp = webapp;
  nodeHelper.require('./post-app', options);
};
