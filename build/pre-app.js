'use strict';

var utils = require('utils');
var nodeHelper = new utils.NodeHelper();

function execute(options) {
  nodeHelper.require('clean-stage-app', options);

  nodeHelper.require('svoperapps', options);

  nodeHelper.require('webapp-manifests', options);

  nodeHelper.require('contacts-import-services', options);

  nodeHelper.require('./keyboard-layouts', options);

  nodeHelper.require('./preferences', options);

  if (options.BUILD_APP_NAME == '*') {
    require('./settings').execute(options);
  }

  // Copy shared files to stage folders
  nodeHelper.require('webapp-shared', options);

  // Copy common files such as webapps.json
  require('./copy-common-files').execute(options);
}

exports.execute = execute;
