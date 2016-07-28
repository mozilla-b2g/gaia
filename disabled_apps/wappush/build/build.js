'use strict';

/* jshint node: true */

var utils = require('utils');

exports.execute = function(config) {
  utils.copyToStage(config);
  var distDir = config.GAIA_DISTRIBUTION_DIR;

  var file = utils.getFile(config.STAGE_APP_DIR, 'js', 'whitelist.json');
  var defaultContent = [];
  var content = utils.getDistributionFileContent('wappush-whitelist',
                                                  defaultContent, distDir);
  utils.writeContent(file, content);
};
