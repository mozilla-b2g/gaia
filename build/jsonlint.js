'use strict';

/* global exports, require, dump */

var utils = require('utils');
var RE_JSON = /\.json$/;

exports.execute = function(options) {
  var jsons = [];
  var dirs = ['apps', 'dev_apps', 'build', 'customization', 'dev_apps',
    'locales', 'shared'];

  dirs.forEach(function(dir) {
    var dirFile = utils.getFile(options.GAIA_DIR, dir);
    var files = utils.ls(dirFile, true).filter(function(f) {
      return RE_JSON.test(f.leafName);
    });
    jsons.push(...files);
  });

  jsons.forEach(function(json) {
    try {
      JSON.parse(utils.getFileContent(json));
    } catch (e) {
      dump('JSON lint error: ' + json.path + '\n');
      throw e;
    }
  });
};
