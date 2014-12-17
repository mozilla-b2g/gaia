'use strict';

/* global exports, require */

var utils = require('./utils');

function execute(options) {
  var targetWebapp = utils.getWebapp(options.APP_DIR,
    options.GAIA_DOMAIN, options.GAIA_SCHEME,
    options.GAIA_PORT, options.STAGE_DIR);

  // if BUILD_APP_NAME isn't `*`, we only accept one webapp
  if (options.BUILD_APP_NAME != '*' &&
    targetWebapp.sourceDirectoryName != options.BUILD_APP_NAME) {
    return;
  }

  let re = new RegExp('\\.html\\.' + options.GAIA_DEFAULT_LOCALE + '$');
  let files = utils.ls(targetWebapp.buildDirectoryFile, true);
  files.forEach(function(file) {
    if (
      re.test(file.leafName) ||
      file.leafName.indexOf(utils.gaia.aggregatePrefix) === 0
    ) {
      file.remove(false);
    }
  });
}

exports.execute = execute;
