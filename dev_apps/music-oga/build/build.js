'use strict';

/* global require, exports */
var utils = require('utils');

exports.execute = function(options) {
  utils.copyToStage(options);
  var sharedPath = utils.gaia.getInstance(options).sharedFolder.path;
  var paths = [
    [sharedPath, 'js', 'blobview.js'],
    [options.APP_DIR, 'js', 'metadata', 'formats.js'],
    [options.APP_DIR, 'js', 'metadata', 'core.js']
  ];
  var targetPath = utils.joinPath(options.STAGE_APP_DIR, 'js',
    'metadata_scripts.js');
  utils.concatenatedScripts(paths, targetPath);
};
