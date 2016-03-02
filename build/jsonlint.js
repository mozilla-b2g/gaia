'use strict';

var utils = require('./utils');
var RE_JSON = /\.json$/;

exports.execute = function() {
  var GAIA_DIR = utils.getEnv('GAIA_DIR');
  var jsons = [];
  var dirs = ['apps', 'dev_apps', 'build', 'customization', 'dev_apps',
    'locales', 'shared'];

  dirs.forEach(function(dir) {
    var dirFile = utils.getFile(GAIA_DIR, dir);
    var files = utils.ls(dirFile, true).filter(function(f) {
      return RE_JSON.test(f.leafName);
    });
    jsons.push(...files);
  });

  jsons.forEach(function(json) {
    try {
      JSON.parse(utils.getFileContent(json));
    } catch (e) {
      utils.log('jsonlint', 'JSON lint error: ' + json.path + '\n');
      throw e;
    }
  });
};
