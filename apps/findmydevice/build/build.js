/* global require */
/* global exports */

'use strict';

var utils = require('utils');

function execute(config) {
  var init = utils.getFile(config.STAGE_APP_DIR, 'js', 'config.js');
  var content = {
    'api_url': 'http://fmd.dev.mozaws.net',
    'api_version': '0'
  };

  var distDir = config.GAIA_DISTRIBUTION_DIR;
  utils.writeContent(init, 'Config = ' +
    utils.getDistributionFileContent('findmydevice', content, distDir) +
    ';');
}

exports.execute = execute;
