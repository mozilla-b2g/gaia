/* global exports */
/* global require */
'use strict';

var utils = require('./utils');
var config;

function debug(str) {
  //dump(' -*- l10n-clean.js: ' + str + '\n');
}

function execute(options) {
  debug('Begin');
  config = options;
  var targetWebapp = utils.getWebapp(options.APP_DIR,
    options.GAIA_DOMAIN, options.GAIA_SCHEME,
    options.GAIA_PORT, options.STAGE_DIR);

  // if BUILD_APP_NAME isn't `*`, we only accept one webapp
  if (config.BUILD_APP_NAME != '*' &&
    targetWebapp.sourceDirectoryName != config.BUILD_APP_NAME) {
    return;
  }

  debug(targetWebapp.sourceDirectoryName);

  let re = new RegExp('\\.html\\.' + config.GAIA_DEFAULT_LOCALE + '$');
  let files = utils.ls(targetWebapp.buildDirectoryFile, true);
  files.forEach(function(file) {
    if (
      re.test(file.leafName) ||
      file.leafName.indexOf(utils.gaia.aggregatePrefix) === 0
    ) {
      file.remove(false);
    }
  });

  debug('End');
}

exports.execute = execute;
