/* global require */
/* global exports */

'use strict';

var utils = require('utils');

function execute(config) {
  var init = utils.getFile(config.STAGE_APP_DIR, 'js', 'config.js');
  var content = {
    'api_url': 'https://fmd.stage.mozaws.net',
    'api_version': '1',
    'audience_url': 'https://oauth.stage.mozaws.net/v1'
  };

  var distDir = config.GAIA_DISTRIBUTION_DIR;
  utils.writeContent(init, 'Config = ' +
    utils.getDistributionFileContent('findmydevice', content, distDir) +
    ';');
}

exports.execute = execute;
