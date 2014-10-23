'use strict';

/* global require, exports */

var utils = require('utils');

exports.execute = function(options) {
  var app = utils.getFile(options.APP_DIR);
  require(app.leafName + '/build').execute(options);

  // Wait for all app tasks to be done before proceeding.
  utils.processEvents(function () {
    return { wait: false };
  });

  require('post-app').execute(options);
};
