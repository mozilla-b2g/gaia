'use strict';

/* jshint node: true */

var utils = require('utils');

exports.execute = function(config) {
  utils.copyToStage(config);
  var init = utils.getFile(config.STAGE_APP_DIR, 'js', 'config.js');
  var content = {
    'api_url': 'https://find.firefox.com',
    'api_version': '1',
  };

  var distDir = config.GAIA_DISTRIBUTION_DIR;
  utils.writeContent(init, 'Config = ' +
    utils.getDistributionFileContent('findmydevice', content, distDir) +
    ';');
};
