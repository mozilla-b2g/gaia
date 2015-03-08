'use strict';

var utils = require('utils');
var nodeHelper = new utils.NodeHelper();

exports.execute = function(options, webapp) {
  options.webapp = webapp;
  // Filter images/video by GAIA_DEV_PIXELS_PER_PX.
  require('./media-resolution').execute(options);

  nodeHelper.require('post-manifest', options);

  require('./multilocale').execute(options);

  nodeHelper.require('copy-build-stage-data', options);

  // Web app optimization steps (like precompling l10n, concatenating js files,
  // etc..).
  require('./webapp-optimize').execute(options);

  if (options.DEBUG === '0') {
    // Generate $(PROFILE_FOLDER)/webapps/APP/application.zip
    require('./webapp-zip').execute(options);
  }
};
