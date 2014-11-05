'use strict';

/* global require, exports */
var utils = require('utils');


exports.execute = function(options) {
  utils.copyToStage(options);
  // copy tv shared files
  var helperPath = utils.joinPath('..', '..', 'tv_apps', 'tv_build',
                                  'tv_shared_helper.js');
  require(helperPath).TVSharedHelper.execute(options);
};
