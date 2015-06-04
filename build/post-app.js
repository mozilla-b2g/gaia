'use strict';

var utils = require('utils');
var nodeHelper = new utils.NodeHelper();

exports.execute = function(options, webapp) {
  options.webapp = webapp;

  nodeHelper.require('media-resolution', options);

  nodeHelper.require('post-manifest', options);

  nodeHelper.require('multilocale', options);

  if (options.HOSTED !== '0') {
    require('make-offline').execute(options);
  }

  nodeHelper.require('copy-build-stage-data', options);

  // Web app optimization steps (like precompling l10n, concatenating js files,
  // etc..).
  require('./webapp-optimize').execute(options);

  if (options.DEBUG === '0') {
    // Workaround for bug 955999, after multilocale, settings and system
    // generate too long args exceed nsIProcess.runw() can handle.
    // Thus, we clean webapp.asts values which generates from l10n in order to
    // pass into nsIProcess.runw()
    // It can remove by bug 1131516 once all post-app tasks are refactored.
    options.webapp.asts = '';
    nodeHelper.require('webapp-zip', options);
  }
};
