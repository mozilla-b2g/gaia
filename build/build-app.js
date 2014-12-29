'use strict';

/* global require, exports */

var utils = require('utils');

exports.execute = function(options) {
  var webapp = utils.getWebapp(options.APP_DIR, options);
  require(webapp.appDir.leafName + '/build').execute(options, webapp);

  // Wait for all app tasks to be done before proceeding.
  utils.processEvents(function () {
    return { wait: false };
  });

  require('post-app').execute(options, webapp);
};
