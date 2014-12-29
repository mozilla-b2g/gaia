'use strict';

/* global exports, require */

var utils = require('./utils');

function execute(options, webapp) {
  // if BUILD_APP_NAME isn't `*`, we only accept one webapp
  if (options.BUILD_APP_NAME != '*' &&
      webapp.sourceDirectoryName != options.BUILD_APP_NAME) {
    return;
  }

  let re = new RegExp('\\.html\\.' + options.GAIA_DEFAULT_LOCALE + '$');
  let files = utils.ls(webapp.buildDirectoryFile, true);
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
