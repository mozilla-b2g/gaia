'use strict';

/* jshint node: true */

var utils = require('utils');

exports.execute = function(options) {
  utils.copyToStage(options);
  createConfigFile(options);
  createMetadataScripts(options);
};

function createConfigFile(options) {
  var targetPath = utils.joinPath(options.STAGE_APP_DIR, 'js', 'config.js');
  var file = utils.getFile(targetPath);
  var content = 'var SERVICE_WORKERS = ' +
    (options.NGA_SERVICE_WORKERS === '1') + ';';

  utils.writeContent(file, content);
}

function createMetadataScripts(options) {
  var targetPath = utils.joinPath(options.STAGE_APP_DIR, 'js',
    'metadata', 'metadata_scripts.js');
  var sharedPath = utils.gaia.getInstance(options).sharedFolder.path;
  var files = [
    utils.joinPath(sharedPath, 'js', 'blobview.js'),
    utils.joinPath(options.APP_DIR, 'js', 'metadata', 'formats.js'),
    utils.joinPath(options.APP_DIR, 'js', 'metadata', 'core.js')
  ];

  utils.concatenatedScripts(files, targetPath);
}
