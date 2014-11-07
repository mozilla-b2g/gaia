'use strict';

/* global exports, require */

var utils = require('./utils');

function execute(options) {
  var gaia = utils.gaia.getInstance(options);

  gaia.rebuildWebapps.forEach(function(webapp) {
    let re = new RegExp('\\.html\\.' + options.GAIA_DEFAULT_LOCALE + '$');
    let files = utils.ls(webapp.buildDirectoryFile, true);
    files.forEach(function(file) {
      if (re.test(file.leafName) ||
        file.leafName.indexOf(gaia.aggregatePrefix) === 0) {
        file.remove(false);
      }
    });
  });
}

exports.execute = execute;
