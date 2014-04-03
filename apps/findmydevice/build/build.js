/* global require */
/* global exports */

'use strict';

var utils = require('utils');

function execute(config) {
  var gaiaDir = config.GAIA_DIR;

  var init = utils.getFile(gaiaDir, 'apps', 'findmydevice', 'js', 'config.js');
  var content = {
    'api_url': 'http://ec2-54-241-87-238.us-west-1.compute.amazonaws.com',
    'api_version': '0'
  };

  var distDir = config.GAIA_DISTRIBUTION_DIR;
  utils.writeContent(init, 'Config = ' +
    utils.getDistributionFileContent('findmydevice', content, distDir) +
    ';');
}

exports.execute = execute;
