'use strict';

var utils = require('utils');
var nodeHelper = new utils.NodeHelper();

function execute(options) {
  nodeHelper.require('clean-stage-app', options);

  nodeHelper.require('svoperapps', options);

  nodeHelper.require('webapp-manifests', options);

  nodeHelper.require('contacts-import-services', options);

  nodeHelper.require('search-provider', options);

  nodeHelper.require('keyboard-layouts', options);

  nodeHelper.require('preferences', options);

  if (options.BUILD_APP_NAME == '*') {
    nodeHelper.require('settings', options);
  }

  nodeHelper.require('webapp-shared', options);

  nodeHelper.require('copy-common-files', options);
}

exports.execute = execute;
