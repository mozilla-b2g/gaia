'use strict';

/* global require, exports */

var utils = require('utils');

function execute(config) {
  var distDir = config.GAIA_DISTRIBUTION_DIR;

  var file = utils.getFile(config.STAGE_APP_DIR, 'js', 'whitelist.json');
  var defaultContent = [];
  var content = utils.getDistributionFileContent('wappush-whitelist',
                                                  defaultContent, distDir);
  utils.writeContent(file, content);
}

exports.execute = execute;
